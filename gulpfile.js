const gulp = require('gulp')
const sass = require('gulp-sass')
const pug = require('gulp-pug')
const rmfr = require('rmfr')
const fs = require('fs')
const connect = require('gulp-connect')
const puppeteer = require('puppeteer')

gulp.task('resume-sass', () => {
  gulp
    .src('src/scss/resume.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('dist/css/'))
    .pipe(connect.reload())
})

gulp.task('sass:watch', () => {
  gulp.watch('./src/scss/resume.scss', ['resume-sass'])
  gulp.watch('./src/scss/components/*.scss', ['resume-sass'])
})

gulp.task('json2pug', () => {
  const locals = JSON.parse(fs.readFileSync('./resume.json', 'utf-8'))
  gulp
    .src('./src/pug/index.pug')
    .pipe(
      pug({
        locals
      })
    )
    .pipe(gulp.dest('./dist/'))
    .pipe(connect.reload())
})

gulp.task('json2pug:watch', () => {
  gulp.watch('./resume.json', ['json2pug'])
  gulp.watch('./src/pug/*.pug', ['json2pug'])
})

function src2dist(dir) {
  return gulp.src(`./src/${dir}/*.*`).pipe(gulp.dest(`./dist/${dir}/`))
}

gulp.task('copy', () => {
  src2dist('pdf')
})

gulp.task('clean', () => {
  rmfr('./dist/')
})

let port = 9000

gulp.task('set-pdf-port', () => {
  port = 9001
})

gulp.task('webserver', () => {
  connect.server({
    root: './dist',
    livereload: true,
    port
  })
})

gulp.task('default', ['resume-sass', 'json2pug', 'copy'])

gulp.task('dev', ['default', 'json2pug:watch', 'sass:watch', 'webserver'])

gulp.task('pdf', ['set-pdf-port', 'default', 'webserver'], async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()

  // In the case of multiple pages in a single browser, each page can have its own viewport size.
  await page.setViewport({
    width: 1440,
    height: 900
  })

  // networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms.
  await page.goto('http://localhost:9001', {waitUntil: 'networkidle0'})

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
  })

  console.log('PDF已生成, 目录./src/pdf')
  browser.close()

  connect.serverClose()
  process.exit(0)
})
