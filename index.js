const axios = require("axios");
const fs = require("fs");
const cheerio = require("cheerio");
const tr = require('tor-request')

// const proxies_file = 'proxies.conf'
const sources_file = __dirname + "/sources.conf";

// #------------------------------------------------------------------------------#
// # Read keywords:
// #------------------------------------------------------------------------------#

function read_keywords_and_sources(source_file) {
  var l_ = [];

  try {
    let content = fs.readFileSync(source_file, "utf-8");
    let lines = content.split("\n");
    l_ = lines.filter((line) => {
      return !line.trim().startsWith("#");
    });
  } catch (err) {
    console.log("Error, failed to read file: check path.");
    console.log(err.stack);
  }

  return l_;
}
// #------------------------------------------------------------------------------#
// # Read proxies:
// #------------------------------------------------------------------------------#

// def read_proxies(proxy_file):
//     proxies_ = {}

//     try:
//         with open(proxy_file, 'r') as f:
//             lines = f.readlines()
//             for line in lines:
//                 line = line.replace('\n','')
//                 if not line.startswith('#'):
//                     l_ = line.split('://')
//                     if isinstance(l_, list) and len(l_) > 1:
//                         proxies_['{}://'.format(l_[0])] = l_[1]
//     except (FileNotFoundError, PermissionError, IsADirectoryError) as e:
//         print('Error, failed to read proxy file: "{}" check path.'.format(proxy_file))
//         exit(1)

//     return proxies_

// #------------------------------------------------------------------------------#
// # Search Google:
// #------------------------------------------------------------------------------#

async function crawl_google(params, proxies) {
  return new Promise((resolve, reject)=>{
    try {
      tr.newTorSession(function(err){
        if(err){
          reject(err);
        }else{
          tr.request({
            url: "https://www.google.com/search",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36",
              Referer: "https://www.google.com/",
              "Sec-Fetch-Site": "same-origin",
              "Sec-Fetch-Mode": "navigate",
              "Sec-Fetch-User": "?1",
              "Sec-Fetch-Dest": "document",
              "Accept-Encoding": "gzip, deflate",
              "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
            },
            qs: params,
    
          }, function(err, resp, body){
            if(err){
              reject(err);
            }else{
              console.log(resp.body)
              const $ = cheerio.load(body);
              const links_found = find_links($);
    
              resolve(links_found);
            }
    
          });
        }
      });
     

    } catch (err) {
      console.log("some error", err);
      reject(err);
    }

  })

}

// #------------------------------------------------------------------------------#
// # Create full search terms:
// #------------------------------------------------------------------------------#

function create_search_terms(keywords, sources) {
  let terms_ = [];
  keywords.forEach((k) => {
    sources.forEach((s) => {
      let t_ = {
        hl: "en",
       // as_q: null,
        as_epq: `${k}`,
        as_qdr: "all",
        as_sitesearch: `${s}`,
        as_occt: "any",
      };
      terms_.push(t_);
    });
  });

  return terms_;
}

// #------------------------------------------------------------------------------#
// # Parse response from Google:
// #------------------------------------------------------------------------------#

function find_links($) {
  var links_ = [];
  $("a").each(function () {
    if ($(this).attr("href")) {
      let h_ = $(this).attr("href");
      if (h_.indexOf("google.com") < 0 && h_.startsWith("http") && links_.indexOf(h_) < 0) {
        links_.push(h_);
      }
    }
  });
  return links_;
}

// #------------------------------------------------------------------------------#
// # Main:
// #------------------------------------------------------------------------------#

// # Print banner:

var keywords = [];
const keywordIndex = process.argv.indexOf('-k');
if(keywordIndex>=0){
    keywords = process.argv[keywordIndex+1].split(',');
}else{
    console.log("keyword argument is missing");
    process.exit(1);
}


// # Grab the keywords, paste sites and proxy addresses:
var sources = read_keywords_and_sources(sources_file);
// proxies = read_proxies(proxies_file)


// # Create search terms from the keywords & sources:
var search_queries = create_search_terms(keywords, sources);

// # Query Google, and print result:
var results = [];
try{
  (async () => {
    results = await Promise.all(
      search_queries.map(async(query_params) => {
        var res_ = await crawl_google(query_params, {});
        return res_;
      })
    );
  //   console.log("Results for all keywords:");
    results.forEach((result_list) => {
      console.log(result_list.join('\n'));
    });
  })();
}catch(err){
  console.error("Error, failed to fetch result:");
  console.error(err.stack);
}