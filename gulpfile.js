'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');

sass.compiler = require('node-sass');

gulp.task('sass', function () {
    return gulp.src('./chart.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('dist'));
});

gulp.task('compress', function () {
    return gulp.src('main.js')
        .pipe(babel({
            presets: ['@babel/env']
        }))
        .pipe(uglify())
        .pipe(gulp.dest('dist'))
});

gulp.task('build', gulp.parallel('sass', 'compress'));