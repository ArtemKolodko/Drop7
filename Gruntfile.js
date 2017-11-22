module.exports = function(grunt) {

    grunt.file.defaultEncoding = 'utf8';
    require("load-grunt-tasks")(grunt);

    grunt.initConfig({
        concat: {
            js: {
                src: ['js/*.js'],
                dest: 'build/build.js'
            },
            css: {
                src: ['css/*.css'],
                dest: 'build/styles.css'
            }
        },
        uglify: {
            options: {
                sourceMap: true
            },
            js: {
                files: {
                    'build/build.min.js': '<%= concat.js.dest %>'
                }
            }
        },
        watch: {
            scripts: {
                files: ['js/*.js', 'css/*.css'],
                tasks: ['concat', 'uglify'],
                options: {
                    spawn: false
                }
            }
        }
    });

    grunt.registerTask('default', ['concat', 'uglify', 'watch']);
};