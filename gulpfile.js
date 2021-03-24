const { src, dest, series, parallel, watch } = require('gulp');
const sass = require('gulp-sass');
const pug = require('gulp-pug');
const rmfr = require('rmfr');
const fs = require('fs');
const connect = require('gulp-connect');
const puppeteer = require('puppeteer');

function src2dist(dir) {
  return src(`./src/${dir}/*.*`).pipe(dest(`./dist/${dir}/`));
}

function cssTranspile() {
  return src('src/scss/resume.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(dest('dist/css/'))
    .pipe(connect.reload());
}

watch(['./src/scss/resume.scss', './src/scss/content.scss'], series(cssTranspile));

function pugTranspile() {
  const locals = JSON.parse(fs.readFileSync('./resume.json', 'utf-8'));
  return src('./src/pug/index.pug')
    .pipe(
      pug({
        locals
      })
    )
    .pipe(dest('./dist/'))
    .pipe(connect.reload());
}

watch(['./resume.json', './src/pug/*.pug'], series(pugTranspile));

function copy(cb) {
  src2dist('fonts');
  src2dist('pdf');
  cb();
}

function clean(cb) {
  rmfr('./dist/');
  cb();
}

let port = 10086;

// 避免打印时，同时运行开发服务报错
function setPdfPort(cb) {
  port = 10010;
  cb();
}

async function generatePDF() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  await page.setViewport({
    width: 1440,
    height: 900
  });

  await page.goto('http://localhost:10010', {waitUntil: 'networkidle0'});

  await page.pdf({
    path: './src/pdf/resume.pdf',
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    margin: {
      top: 30,
      right: 40,
      bottom: 30,
      left: 40
    }
  });

  console.log('PDF已生成, 目录./src/pdf');
  await browser.close();

  connect.serverClose();
  process.exit(0);
}

function livereload(cb) {
  connect.server({
    root: './dist',
    livereload: true,
    port
  });
  cb();
}

exports.default = series(
  cssTranspile,
  pugTranspile,
  copy
);

exports.dev = series(
  cssTranspile,
  pugTranspile,
  copy,
  livereload
);

exports.pdf = series(
  parallel(
    setPdfPort,
    series(
      cssTranspile,
      pugTranspile,
      copy,
      livereload
    )
  ),
  generatePDF
);

exports.clean = clean;
