const gulp = require('gulp');
const sass = require('gulp-sass');
const pug = require('gulp-pug');
const rmfr = require('rmfr');
const fs = require('fs');
const connect = require('gulp-connect');
const puppeteer = require('puppeteer');
const { series } = require('gulp');

gulp.task('resume-sass', async () => {
  gulp
    .src('src/scss/resume.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('dist/css/'))
    .pipe(connect.reload());
});

gulp.task('sass:watch', async () => {
  gulp.watch('./src/scss/resume.scss', gulp.series('resume-sass'));
  gulp.watch('./src/scss/content.scss', gulp.series('resume-sass'));
});

gulp.task('json2pug', async () => {
  const locals = JSON.parse(fs.readFileSync('./resume.json', 'utf-8'))
  gulp
    .src('./src/pug/index.pug')
    .pipe(
      pug({
        locals
      })
    )
    .pipe(gulp.dest('./dist/'))
    .pipe(connect.reload());
});

gulp.task('json2pug:watch', async () => {
  gulp.watch('./resume.json', gulp.series('json2pug'));
  gulp.watch('./src/pug/*.pug', gulp.series('json2pug'));
});

function src2dist(dir) {
  return gulp.src(`./src/${dir}/*.*`).pipe(gulp.dest(`./dist/${dir}/`));
}

gulp.task('copy', async () => {
  src2dist('fonts');
  src2dist('pdf');
});

gulp.task('clean', async () => {
  rmfr('./dist/');
});

let port = 10086;

// 避免打印时，同时运行开发服务报错
gulp.task('set-pdf-port', async () => {
  port = 10010;
});

gulp.task('webserver', async () => {
  connect.server({
    root: './dist',
    livereload: true,
    port
  });
});

// gulp.task('default', ['resume-sass', 'json2pug', 'copy'])
gulp.task('default', gulp.series('resume-sass', 'json2pug', 'copy'));

gulp.task('dev', gulp.series('default', 'json2pug:watch', 'sass:watch', 'webserver'));

gulp.task('pdf', series(gulp.parallel('set-pdf-port', 'default', 'webserver'), async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // In the case of multiple pages in a single browser, each page can have its own viewport size.
  await page.setViewport({
    width: 1440,
    height: 900
  });

  // networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms.
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
  browser.close();

  connect.serverClose();
  process.exit(0);
}));
