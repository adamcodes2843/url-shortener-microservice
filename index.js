require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose')
const mySecret = process.env['MONGO_URI']
let bodyParser = require('body-parser')
const dns = require('node:dns')

mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true });

// Basic Configuration
const URLSchema = new mongoose.Schema({
  original_url: {type: String, required: true, unique: true},
  short_url: {type: String, required: true, unique: true}
})

let URLModel = mongoose.model("url", URLSchema)

const port = process.env.PORT || 3000;

// Middleware function to parse post requests
app.use("/", bodyParser.urlencoded({ extended: false }))

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:short_url', function(req, res) {
  let short_url = req.params.short_url;
  // find the original url from the database
  URLModel.findOne({short_url: short_url}).then((foundURL) => {
    if (foundURL){
      let original_url = foundURL.original_url
      res.redirect(original_url)
    } else {
      res.json({message: "The short url does not exist!"})
    }
  })
})

// Your first API endpoint
app.post('/api/shorturl', function(req, res) {
  let url = req.body.url
  // Check if it's validate url
  try {
    urlObj = new URL(url)
    dns.lookup(urlObj.hostname, (err, address, family) => {
      //If the DNS domain does not exist and no address is returned
      if (!address) {
        res.json({ error: 'invalid url' })
      } else {
        // valid url
        let original_url = urlObj.href
        // check if url is already in the database
        URLModel.findOne({original_url: original_url}).then(
          (foundURL) => {
          if (foundURL) {
            res.json({original_url: foundURL.original_url, short_url: foundURL.short_url})
          } else {
            // if URL isn't in database
            let short_url = 1
            // get the next short_url
            URLModel.find({}).sort({short_url: "desc"}).limit(1).then(
            (latestURL) => {
              if (latestURL.length > 0) {
              short_url = parseInt(latestURL[0].short_url) + 1
              }
              resObj = {
                original_url: original_url,
                short_url: short_url
              }
              // create an entry in the database
              let newURL = new URLModel(resObj)
              newURL.save();
              res.json(resObj)
              }
            )
          }
        })
      }
    })
  }
  // If the url has an invalid format
  catch {
    res.json({ error: 'invalid url' })
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
