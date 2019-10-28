const PATH_TO_FILE = './server/data';
const FILE = 'data.ndjson';
const ERRORS_MODEL = require('../../models/Models.Errors');

module.exports = (router, utils) => {
  
  // Get all errors by year...
  router.get('/errors/year/:year', async (req, res) => {
    let streamChunks = [];
    const readStream = await utils.fs.createReadStream(utils.path.resolve(`${PATH_TO_FILE}/${FILE}`))
      .pipe(utils.ndjson.parse())
      .on('data', (data) => {
        if(utils.moment(data.date).year() === Number(req.params.year)) {
          streamChunks.push(data);
        }
    });
    readStream.on('end', () => {
      const data = new ERRORS_MODEL.Errors(streamChunks, Number(req.params.year));
      res.status(200).send(data);
    });
  });

  // Get all years by year...
  router.get('/errors/data/years', async (req, res) => {
    let streamChunks = [];
    const readStream = await utils.fs.createReadStream(utils.path.resolve(`${PATH_TO_FILE}/${FILE}`))
      .pipe(utils.ndjson.parse())
      .on('data', (data) => {
          streamChunks.push(data);
    });

    readStream.on('end', () => {
      const years = new ERRORS_MODEL.Years(streamChunks);
      res.status(200).send(years);
    });
  });

  // Get last errors sumatory...
  router.get('/errors/year/:year/last-days', async (req, res) => {
    let streamChunks = [];
    const readStream = await utils.fs.createReadStream(utils.path.resolve(`${PATH_TO_FILE}/${FILE}`))
      .pipe(utils.ndjson.parse())
      .on('data', (data) => {
        if(utils.moment(data.date).year() === Number(req.params.year)) {
          streamChunks.push(data);
        }
    });

    readStream.on('end', () => {
      const data = new ERRORS_MODEL.LastErrorsByYear(streamChunks, Number(req.params.year));
      res.status(200).send(data);
    });
  });
};
