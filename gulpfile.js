'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');
const browserSync = require('browser-sync').create();

sass.compiler = require('node-sass');
let isProd = true;

gulp.task('sass', function () {
    return gulp.src(isProd ? './chart.scss' : ['./chart.scss', './styles.scss'])
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(isProd ? 'dist' : './'))
        .pipe(browserSync.stream());
});

gulp.task('compress', function () {
    return gulp.src('main.js')
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

gulp.task('watch', function () {
    gulp.watch(['./index.html', './main.js']).on('change', browserSync.reload);
    gulp.watch(['./styles.scss', './chart.scss'], gulp.parallel('sass'));
});

gulp.task('build', gulp.parallel('sass', 'compress'));
gulp.task('default', gulp.parallel('browser-sync', 'watch'));