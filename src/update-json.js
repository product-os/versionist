var os = require('os');
var fs = require('fs');
var async = require('async');

module.exports = function (path, data, cb) {
	function load(callback) {
		fs.readFile(path, 'utf8', callback);
	}

	function parse(content, callback) {
		try {
			var jsonData = JSON.parse(content);
			callback(null, jsonData);
		} catch (error) {
			callback(error);
		}
	}

	function update(jsonData, callback) {
		for (const key of Object.keys(data)) {
			jsonData[key] = data[key];
		}
		callback(null, jsonData);
	}

	function save(jsonData, callback) {
		var content = JSON.stringify(jsonData, null, '  ') + os.EOL;
		fs.writeFile(path, content, 'utf8', callback);
	}

	async.waterfall([load, parse, update, save], function (error, result) {
		cb(error);
	});
};
