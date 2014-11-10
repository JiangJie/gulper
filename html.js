var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var co = require('co');

var through = require('through2');

var REGEXP_BEGIN = /<!--\s*build:(http.+)\s*-->/i;
var REGEXP_END = /<!--\s*endbuild\s*-->/i;

var REGEXP = /<!--\s*build:(http.+)\s*-->.+[src|href]="(.+)".+<!--\s*endbuild\s*-->/ig;

function stream2Buffer(stream) {
    return function(fn) {
        var buffers = [];
        var totalLength = 0;
        stream.once('readable', function() {
            console.log('read');
            console.log(stream.read());
            var chunk;
            while(null !== (chunk = stream.read())) {
                console.log('read1');
                buffers.push(chunk);
                totalLength += chunk.length;
            }
        });

        stream.on('error', function(err) {
            fn(err);
        });

        stream.on('end', function() {
            fn(null, Buffer.concat(buffers, totalLength));
        });
    }
}

// var stream = fs.createReadStream('./src/index.html');
// stream.on('readable', function() {
//     console.log('createReadStream', stream.read());
// });

function makeAbsoluteFileName(file, fileName) {
    return path.join(path.dirname(file.path), fileName);
}

module.exports = function() {
    return through.obj(function(file, enc, fn) {
        console.log('isNull', file.isNull());
        console.log('isStream', file.isStream());
        console.log('isBuffer', file.isBuffer());
        
        if(file.isStream()) {
            // file.contents.on('data', function(chunk) {
            //     console.log('file.contents', chunk);
            // });
            // co(function*() {
                var buf = stream2Buffer(file.contents)(function(err, buf) {
                    console.log(buf.length);
                });
            // })();
        } else if(file.isBuffer()) {
            var contents = file.contents.toString();

            var linefeed = /\r\n/g.test(contents) ? '\r\n' : '\n';
            var lines = contents.split(linefeed);

            // 压缩过的
            if(lines.length === 1) {
                contents = contents.split('><').join('>' + linefeed + '<');
                lines = contents.split(linefeed);
                linefeed = '';
            }

            var res = {
                js: [],
                css: []
            };

            var cdn;
            var parsing = false;
            lines.forEach(function(line) {
                var start = line.match(REGEXP_BEGIN);
                var end = REGEXP_END.test(line);

                if(start) {
                    cdn = start[1];
                    parsing = true;
                } else if(end) {
                    cdn = '';
                    parsing = false;
                } else {
                    if(parsing && cdn) {
                        var m = line.match(/<script .*src="([^"]+)".*>/);
                        if(m) {
                            res.js.push({cdn: cdn, path: m[1]});
                            line = line.replace(m[1], 'js:' + cdn + m[1]);
                            return;
                        }

                        m = line.match(/<link .*href="([^"]+)".*>/);
                        if(m) {
                            res.css.push({cdn: cdn, path: m[1]});
                            line = line.replace(m[1], 'css:' + cdn + m[1]);
                        }
                    }
                }
            });

            lines = lines.join('');

            console.log(res);

            var dirname = path.dirname(file.path);

            res.css.forEach(function(item) {
                var fileName = path.join(dirname, item.path);
                fs.readFile(fileName, function(err, content) {
                    if(err) throw err;
                    var md5 = crypto.createHash('md5').update(content, 'utf8').digest('hex').substring(0, 5);
                    console.log(md5);
                    lines = lines.replace('css:' + item.cdn + item.path, md5);
                    console.log(lines);
                });
            });
        }

        this.push(file);

        fn();
    });
};