// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const { SpecReporter } = require('jasmine-spec-reporter');

exports.config = {
    allScriptsTimeout: 11000,
    specs: [
        './e2e/**/*.e2e-spec.ts',
    ],
    capabilities: {
        'browserName': 'chrome',
        chromeOptions: {
            args: [ '--headless', '--no-sandbox', '--disable-gpu', '--window-size=800,600' ],
        },
    },
    directConnect: true,
    baseUrl: 'http://localhost:4200/',
    framework: 'jasmine',
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 30000,
        print: function () {},
    },
    plugins: [{
        package: 'protractor-console-plugin',
    }],
    onPrepare () {
        require('ts-node').register({
            project: 'e2e/tsconfig.e2e.json',
        });
        // eslint-disable-next-line no-undef
        jasmine.getEnv().addReporter(new SpecReporter({ spec: { displayStacktrace: true } }));
    },
};