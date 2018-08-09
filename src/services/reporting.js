const moment = require('moment');
const Campaign = require('../models/campaign');
const Story = require('../models/story');
const Analytics = require('../models/analytics/event');
const { ObjectId } = require('mongoose').Types;
const { google, auth } = require('../connections/google');

const retrieveGAData = async (start, end, metrics = []) => {
  const api = google.analyticsreporting({
    version: 'v4',
    auth: await auth(['https://www.googleapis.com/auth/analytics']),
  });

  const dateRanges = [
    {
      startDate: moment(start).format('YYYY-MM-DD'),
      endDate: moment(end).format('YYYY-MM-DD'),
    },
  ];

  const res = await api.reports.batchGet({
    requestBody: {
      reportRequests: [
        {
          viewId: '178806143', // 31090033 // What to do with this? Set to FH.com for now, should be internal NX structure? Also needs to target against the story by url/other.
          dateRanges,
          metrics,
        },
      ],
    },
  });
  return res.data;
};


const createDateRange = (start, end) => {
  const dates = [];
  let current = start;
  while (current <= end) {
    dates.push(moment(current));
    current = moment(current).add(1, 'days');
  }
  return dates;
};

const fillDayData = (date, days) => {
  const day = moment(date).format('YYYY-MM-DD');
  for (let i = 0; i < days.length; i += 1) {
    const d = days[i];
    if (d.date === day) {
      d.date = moment(day).toDate();
      return d;
    }
  }
  const views = 0;
  const clicks = 0;
  const ctr = 0;
  return {
    date: moment(day).toDate(),
    views,
    clicks,
    ctr,
  };
};

const getCtrProject = () => ({
  $cond: [{ $eq: ['$views', 0] }, 0.00, { $divide: [{ $floor: { $multiply: [10000, { $divide: ['$clicks', '$views'] }] } }, 100] }],
});

const retrieveStorySummaryStats = async (start, end) => {
  const metrics = [
    { expression: 'ga:sessions' },
    { expression: 'ga:hits' },
    { expression: 'ga:avgTimeOnPage' },
  ];
  const res = await retrieveGAData(start, end, metrics);
  const dataset = res.reports[0].data.rows[0].metrics[0].values;
  return {
    visits: dataset[0],
    views: dataset[1],
    time: Math.floor(dataset[2]),
  }
}

module.exports = {
  /**
   *
   * @param {*} pushId
   */
  async campaignSummary(pushId) {
    const campaign = await Campaign.findOne({ pushId });
    if (!campaign) throw new Error(`No campaign record found for pushId '${pushId}'`);
    const cid = campaign.get('id');
    const start = moment(campaign.get('criteria.start')).startOf('day');
    const end = campaign.get('criteria.end')
      ? moment(campaign.get('criteria.end')).endOf('day')
      : moment().endOf('day');
    const pipeline = [
      {
        $match: {
          cid: new ObjectId(cid),
          e: { $in: ['view-js', 'click-js'] },
          d: { $gte: start.toDate(), $lte: end.toDate() },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$d' } },
          view: { $cond: [{ $eq: ['$e', 'view-js'] }, 1, 0] },
          click: { $cond: [{ $eq: ['$e', 'click-js'] }, 1, 0] },
        },
      },
      {
        $group: {
          _id: '$date',
          views: { $sum: '$view' },
          clicks: { $sum: '$click' },
        },
      },
      {
        $sort: { date: 1 },
      },
      {
        $project: {
          date: '$_id',
          views: '$views',
          clicks: '$clicks',
          ctr: getCtrProject(),
        },
      },
      {
        $group: {
          _id: null,
          days: {
            $push: {
              date: '$date',
              views: '$views',
              clicks: '$clicks',
              ctr: '$ctr',
            },
          },
          views: { $sum: '$views' },
          clicks: { $sum: '$clicks' },
        },
      },
      {
        $project: {
          _id: 0,
          days: 1,
          views: 1,
          clicks: 1,
          ctr: getCtrProject(),
        },
      },
    ];
    const results = await Analytics.aggregate(pipeline);
    const out = results[0];
    if (!out) return this.emptySummary();
    const dates = createDateRange(start, end);
    out.days = dates.map(d => fillDayData(d, out.days));
    return out;
  },

  /**
   *
   */
  emptySummary() {
    return {
      views: 0,
      clicks: 0,
      ctr: 0,
      days: [],
    };
  },

  /**
   *
   * @param {*} pushId
   */
  async campaignCreativeBreakdown(pushId) {
    const campaign = await Campaign.findOne({ pushId });
    if (!campaign) throw new Error(`No campaign record found for pushId '${pushId}'`);
    const cid = campaign.get('id');
    const creatives = campaign.get('creatives');
    const creativeIds = [];
    const creativesById = [];
    creatives.forEach((creative) => {
      creativeIds.push(creative._id);
      creativesById[creative._id] = creative;
    });
    const start = moment(campaign.get('criteria.start')).startOf('day');
    const end = campaign.get('criteria.end')
      ? moment(campaign.get('criteria.end')).endOf('day')
      : moment().endOf('day');
    const pipeline = [
      {
        $match: {
          e: { $in: ['load-js', 'view-js', 'click-js', 'contextmenu-js'] },
          d: { $gte: start.toDate(), $lte: end.toDate() },
          cid: ObjectId(cid),
          cre: { $exists: true },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$d' } },
          e: '$e',
          cid: '$cid',
          cre: '$cre',
        },
      },
      {
        $group: {
          _id: {
            e: '$e',
            date: '$date',
            cre: '$cre',
          },
          n: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: false,
          date: '$_id.date',
          cre: '$_id.cre',
          view: { $cond: [{ $eq: ['$_id.e', 'view-js'] }, '$n', 0] },
          click: { $cond: [{ $eq: ['$_id.e', 'click-js'] }, '$n', 0] },
        },
      },
      {
        $group: {
          _id: {
            date: '$date',
            cre: '$cre',
          },
          views: { $sum: '$view' },
          clicks: { $sum: '$click' },
        },
      },
      {
        $project: {
          _id: false,
          date: '$_id.date',
          cre: '$_id.cre',
          views: '$views',
          clicks: '$clicks',
          ctr: getCtrProject(),
        },
      },
      {
        $sort: { date: 1 },
      },
      {
        $group: {
          _id: '$cre',
          days: { $push: '$$ROOT' },
          clicks: { $sum: '$clicks' },
          views: { $sum: '$views' },
        },
      },
      {
        $project: {
          id: '$_id',
          cre: '$_id.cre',
          days: '$days',
          views: '$views',
          clicks: '$clicks',
          ctr: getCtrProject(),
        },
      },
      {
        $group: {
          _id: null,
          creatives: { $push: '$$ROOT' },
          clicks: { $sum: '$clicks' },
          views: { $sum: '$views' },
        },
      },
      {
        $project: {
          _id: false,
          creatives: '$creatives',
          views: '$views',
          clicks: '$clicks',
          ctr: getCtrProject(),
        },
      },
    ];
    const results = await Analytics.aggregate(pipeline);
    const out = results[0];
    if (!out) return this.emptyCampaignBreakdown(creatives);
    const dates = createDateRange(start, end);
    for (let i = 0; i < out.creatives.length; i += 1) {
      const id = out.creatives[i]._id;
      out.creatives[i].creative = creativesById[id];
      out.creatives[i].days = dates.map(d => fillDayData(d, out.creatives[i].days));
    }
    return out;
  },

  /**
   *
   * @param {*} creatives
   */
  emptyCampaignBreakdown(creatives) {
    return {
      creatives: creatives.map(creative => ({
        creative,
        views: 0,
        clicks: 0,
        ctr: 0,
        days: [],
      })),
      views: 0,
      clicks: 0,
      ctr: 0,
    };
  },

  /**
   *
   * @param {*} id
   */
  async storySummary(id) {

    const story = await Story.findById(id);
    if (!story) throw new Error(`No story record found for id '${id}'`);
    const start = moment(story.get('createdAt')).startOf('day');
    const end = moment().endOf('day');

    const { visits, views, time } = await retrieveStorySummaryStats(start, end);

    // const metrics = [
    //   { expression: 'ga:sessions' },
    //   { expression: 'ga:hits' },
    //   { expression: 'ga:avgTimeOnPage' },
    //   { expression: 'ga:avgSessionDuration' },
    //   // { expression: 'ga.source' },
    //   // { expression: 'ga.socialNetwork' },
    // ];
    // const res = await retrieveGAData(start, end, metrics);

    // const times = gadata.reports[0].data.rows[0].metrics[0].values;
    // const stats = gadata.reports[1].data.rows[0].metrics[0].values;

    // const time = Math.floor(times[0]);
    // const visits = Math.floor(stats[0]);
    // const views = Math.floor(stats[1]);

    // // gadata.reports.forEach((report) => {
    // //   const { columnHeader, data } = report;
    // //   console.warn('\n---- NEW REPORT ----\n');
    // //   columnHeader.metricHeader.metricHeaderEntries.forEach(e => console.warn(e));
    // //   console.warn('--------------------\n')
    // //   data.rows.forEach(r => r.metrics.forEach((m) => console.warn(m)));
    // //   console.warn('--------------------\n\n')

    // // });

    const dates = createDateRange(start, end);

    // Initial test data
    const accquisitionData = {
      socialReferral: 2 * Math.floor(Math.random() * 1000),
      nativeAdCampaign: 3 * Math.floor(Math.random() * 1000),
      bannerAdCampaign: 1 * Math.floor(Math.random() * 1000),
      organicSearch: 1 * Math.floor(Math.random() * 1000),
      emailCampaign: 1 * Math.floor(Math.random() * 1000),
      direct: 2 * Math.floor(Math.random() * 1000),
    };
    let { socialReferral } = accquisitionData;
    const sharesData = {};
    ['facebook', 'twitter', 'reddit', 'email'].forEach((k) => {
      const diff = Math.floor(socialReferral * Math.random());
      socialReferral -= diff;
      sharesData[k] = diff;
    });
    sharesData.other = socialReferral;

    // const views = Object.keys(accquisitionData).reduce((p, c) => {
    //   const prev = (p === 'socialReferral') ? 0 : p;
    //   return prev + accquisitionData[c];
    // });

    const out = {
      visits, //: Math.floor(views * Math.random()),
      views,
      shares: accquisitionData.socialReferral,
      time, //: Math.floor(120 * Math.random()),
      accquisitionData,
      sharesData,
      interactionsData: dates.map(d => ({
        date: moment(d).toDate(),
        visits: Math.floor(Math.random() * 1000),
        views: Math.floor(Math.random() * 10000),
        shares: Math.floor(Math.random() * 100),
      })),
    };
    return out;
  },
};
