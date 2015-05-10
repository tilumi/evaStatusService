try {
    var _ = require("lodash");
    var buffer = require("vinyl-buffer");
    var browserify = require("browserify");
    var concat = require("gulp-concat");
    var file = require("read-file");
    var forEach = require("gulp-foreach");
    var gulp = require("gulp");
    var jshint = require("gulp-jshint");
    var log = require("npmlog");
    var rename = require("gulp-rename");
    var runSequence = require("run-sequence");
    var shell = require("shelljs");
    var size = require("gulp-size");
    var source = require("vinyl-source-stream");
    var sourcemaps = require("gulp-sourcemaps");
    var uglify = require("gulp-uglify");
    var util = require("gulp-util");
    var watchify = require("watchify");
    var print = require('gulp-print');
    var livereload = require('gulp-livereload');
} catch (e) {
    // Unknown error, rethrow it.
    if (e.code !== "MODULE_NOT_FOUND") {
        throw e;
    }

    // Otherwise, we have a missing dependency. If the module is in the dependency list, the user just needs to run `npm install`.
    // Otherwise, they need to install and save it.
    var dependencies = require("./package.json").devDependencies;
    var module = e.toString().match(/'(.*?)'/)[1];
    var command = "npm install";

    if (typeof dependencies[module] === "undefined") {
        command += " --save-dev " + module;
    }

    console.error(e.toString() + ". Fix this by executing:\n\n" + command + "\n");
    process.exit(1);
}

const APPS_GLOB = "./client-app/**/*.js";
const APPS_DIST_DIR = "./static/";

const BROWSERIFY_TRANSFORMS = ["reactify", "brfs"];
const SIZE_OPTS = {
    showFiles: true,
    gzip: true
}
const LINT_OPTS = {
    unused: true,
    eqnull: true,
    jquery: true
};

function getBundler(file, options) {
    options = _.extend(options || {}, {
        // Enable source maps.
        debug: true,
        // Configure transforms.
        transform: BROWSERIFY_TRANSFORMS
    });

    // Initialize browserify with the file and options provided.
    var bundler = browserify(file.path, options);

    return bundler;
}

function bundle(file, bundler, compileCommon) {
    var relativeFilename = file.path.replace(file.base, "");
    shell.echo(relativeFilename);
    if(!compileCommon){
        if(relativeFilename == 'js/lib/common.js') {
            return bundler;
        }
    }
    return bundler
        // Log browserify errors
        .on("error", util.log.bind(util, "Browserify Error"))
        // Bundle the application
        .bundle()
        // Rename the bundled file to relativeFilename
        .pipe(source(relativeFilename))
        // Convert stream to a buffer
        .pipe(buffer())
        // Save the source map for later (uglify will remove it since it is a comment)
        .pipe(sourcemaps.init({loadMaps: true}))
        // Save normal source (useful for debugging)
        .pipe(gulp.dest(APPS_DIST_DIR))
        // Minify source for production
        .pipe(uglify())
        // Restore the sourceMap
        .pipe(sourcemaps.write())
        // Add the .min suffix before the extension
        .pipe(rename({suffix: ".min"}))
        // Log the bundle size
        .pipe(size(SIZE_OPTS))
        // Write the minified file.
        .pipe(gulp.dest(APPS_DIST_DIR))
        .pipe(livereload());;
}

gulp.task('compile-all', function () {

    var stream = gulp.src(APPS_GLOB)
        .pipe(forEach(function (stream, file) {
            bundle(file, getBundler(file), true);
            return stream;
        }));

    return stream;
});

gulp.task('compile-app', function () {

    var stream = gulp.src(APPS_GLOB)
        .pipe(forEach(function (stream, file) {
            bundle(file, getBundler(file), false);
            return stream;
        }));

    return stream;
});

gulp.task("autobuild", function() {
    livereload.listen({ start: true });
    return gulp.src(APPS_GLOB)
        .pipe(forEach(function(stream, file) {
            // Get our bundler just like in the "build" task, but wrap it with watchify and use the watchify default args (options).
            var bundler = watchify(getBundler(file, watchify.args));

            function rebundle() {
                return bundle(file, bundler, false);
            }

            // Whenever the application or its dependencies are modified, automatically rebundle the application.
            bundler.on("update", rebundle);

            // Rebundle this application now.
            return rebundle();
        }));
});

