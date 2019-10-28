const compression = require('compression');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const api = require('./api');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(compression());
app.use('/api', api);
app.use(express.static('static'));

app.use((req, res) => {
  const err = new Error('Not Found');
  err.status = 404;
  res.json(err);
});

app.set('port', (process.env.PORT || 8081));

app.listen(app.get('port'), () => {
  console.log(`API Server Listening on port ${app.get('port')}!`);
});
