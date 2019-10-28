const express = require('express');

const path = require('path');
const fs = require('fs');
const moment = require('moment');
const ndjson = require('ndjson');

const utils = { path, fs, moment, ndjson };
const router = express.Router();

require('./routes/errors')(router, utils);

module.exports = router;
