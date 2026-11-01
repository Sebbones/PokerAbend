import base from '../../playwright.config.js';
export default {...base,testDir:'.',testMatch:['ui.spec.js','poker-regression.spec.js'],outputDir:'_artifacts/test-results'};
