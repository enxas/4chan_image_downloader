try {
    var fs = require('fs');
	var request = require('request');
	var mkdirp = require('mkdirp');
	var program = require('commander');
}
catch (e) {
    if (e instanceof Error && e.code === "MODULE_NOT_FOUND") {
        console.log(`Couldn't find one or more required modules. Please run "npm install"`);
		process.exit(1);
    } else {
        throw e;
		process.exit(1);
	}
}

program
  .description('An application for downloading all images from 4chan thread')
  .option('-b, --board <n>', 'Board letter')
  .option('-t, --thread <n>', 'Thread id', parseInt)
  .parse(process.argv);
  
const board = program.board;
const thread = program.thread;
const dir = 'images/'+ thread;

request({
  url: 'https://a.4cdn.org/'+ board +'/thread/'+ thread +'.json',
  json: true
}, function(error, response, body) {
	const imageList = [];
	
	if (body) {
	for (let post in body.posts) {
		if (body.posts[post].tim) {
			imageList.push(body.posts[post].tim + body.posts[post].ext);
		}
	}
	
	// create folder structure for images
	mkdirp(dir, function(err) { 
		if (err) {
			console.log(`Error while creating folder ${dir}. ${err}`);
		} else {
			asyncDownload(board, imageList);
		}
	});
} else {
	console.log(`Couldn't find specified board "${board}" or thread id "${thread}"`);
}

});

async function asyncDownload(board, imageList) {
	console.log(`Found ${imageList.length} images, downloading to ${dir} !`);
	for (let i = 0; i < imageList.length; i++) {
		let imgPath = dir+'/'+ imageList[i];
		if (fs.existsSync(imgPath)) {
			console.log(`File ${imageList[i]} exists, skipping... (${i+1}/${imageList.length})`);
			continue;
		}
		await download('https://i.4cdn.org/'+ board +'/'+ imageList[i], imgPath);
		console.log(`Downloaded ${imageList[i]} (${i+1}/${imageList.length})`);
	}
	console.log(`Finished downloading all ${imageList.length} images!`);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
   
    var file = fs.createWriteStream(dest);
    var sendReq = request.get(url);

    // verify response code
    sendReq.on('response', function(response) {
        if (response.statusCode !== 200) {
			// return cb('Response status was ' + response.statusCode);
			console.log('Response status was ' + response.statusCode);
            reject();
        }
    });

    // check for request errors
    sendReq.on('error', function (err) {
        fs.unlink(dest);
		// return cb(err.message);
		console.log(err.message);
        reject();
    });

    sendReq.pipe(file);

    file.on('finish', function() {
        file.close(resolve());  // close() is async, call cb ( file.close(cb); ) after close completes.
    });

    file.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        // return cb(err.message);
		console.log(err.message);
    });	
   
  });
}
