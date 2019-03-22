'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');
const browserSync = require('browser-sync').create();
const cleanCSS = require('gulp-clean-css');

sass.compiler = require('node-sass');
let isProd = true;

gulp.task('sass', function () {
    return gulp.src(isProd ? './tg-chart.scss' : ['./tg-chart.scss', './styles.scss'])
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS({compatibility: 'ie11'}))
        .pipe(gulp.dest(isProd ? 'dist' : './'))
        .pipe(browserSync.stream());
});

gulp.task('compress', function () {
    return gulp.src('tgchart.js')
        .pipe(babel({
            presets: ['@babel/env']
        }))
        .pipe(uglify())
        .pipe(gulp.dest('dist'))
});

gulp.task('browser-sync', function () {
    isProd = false;
    browserSync.init({
        open: false,
        server: {
            baseDir: "./"
        }
    });
});

gulp.task('data', function () {
    return gulp.src('data/**/*.*')
        .pipe(gulp.dest('dist/data'));
})

gulp.task('watch', gulp.parallel('sass'), function () {
    gulp.watch(['./index.html', './tgchart.js']).on('change', browserSync.reload);
    gulp.watch(['./styles.scss', './tg-chart.scss'], gulp.parallel('sass'));
});

gulp.task('build', gulp.parallel('sass', 'compress', 'data'));
gulp.task('default', gulp.parallel('browser-sync', 'watch'));