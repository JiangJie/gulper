'use strict';

var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var gulpif = require('gulp-if');

var clean = require('gulp-clean');

var browserify = require('browserify');
var source = require('vinyl-source-stream');
var template = require('gulp-lodash-template');

var stylus = require('gulp-stylus');
var nib = require('nib');

var usemin = require('gulp-usemin');
var revall = require('gulp-rev-all');

var replace = require('gulp-replace');
var cdn = require('gulp-cdn-replace');

var sprite = require('css-sprite').stream;

var run = require('run-sequence');

var src = './src';
var dest = './dist';

gulp.task('clean', function() {
    return gulp.src(dest, {read: false})
        .pipe(clean());
});
gulp.task('clean-dev', function() {
    return gulp.src([src + '/js', src + '/css'], {read: false})
        .pipe(clean());
});

gulp.task('tmpl', function() {
    return gulp.src(src + '/browserify/tmpl/*.html')
        .pipe(template({
            strict: true,
            commonjs: true
        }))
        .pipe(gulp.dest(src + '/browserify/tmpl/'));
});

gulp.task('browserify', ['tmpl'], function() {
    return browserify(src + '/browserify/index.js')
        .bundle()
        .pipe(source('index.js'))
        .pipe(gulp.dest(src + '/js/'));
});

gulp.task('jslib', function() {
    return gulp.src(src + '/browserify/lib/**.js')
        .pipe(gulp.dest(src + '/js/lib/'));
});

gulp.task('stylus', function() {
    return gulp.src(src + '/stylus/!(_)*.styl')
        .pipe(stylus({use: [nib()]}))
        .pipe(gulp.dest(src + '/css/'));
});

gulp.task('usemin', ['clean'], function() {
    gulp.src(src + '/*.html')
        .pipe(usemin({
            zepto: [revall({hashLength: 5})],
            index_js: [
                revall({
                    // prefix: 'http://s1.url.cn/qqweb/m/gulper/',
                    hashLength: 5
                })
            ],
            index_css: [
                revall({
                    hashLength: 5
                })
            ]
        }))
        .pipe(gulp.dest(dest));
});

gulp.task('revall', ['clean'], function() {
    gulp.src(src+ '/js/**')
        .pipe(revall({
            hashLength: 5
        }))
        .pipe(gulp.dest(dest + '/js/'));
    gulp.src(src+ '/css/**')
        .pipe(revall({
            hashLength: 5
        }))
        .pipe(gulp.dest(dest + '/css/'));
});

gulp.task('cdn', function() {
    gulp.src(src + '/*.html')
        .pipe(cdn({
            dir: dest,
            root: {
                js: 'http://s1.url.cn/gulper/',
                css: 'http://s2.url.cn/gulper/'
            }
        }))
        .pipe(gulp.dest(dest));
});

gulp.task('sprite', function() {
    gulp.src(src + '/stylus/icon/*.png')
        .pipe(sprite({
            name: 'sprite',
            style: '_sprite.styl',
            cssPath: './icon',
            processor: 'syulus'
        }))
        .pipe(gulpif('*.png', gulp.dest(src + '/css/img/')), gulp.dest(src + '/css/'));
});

gulp.task('default', ['clean-dev'], function() {
    run(['jslib', 'browserify', 'stylus']);
});