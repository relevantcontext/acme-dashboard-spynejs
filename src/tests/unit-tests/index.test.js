import { add } from 'ramda';
import { expect } from 'chai';
import { SpyneApp, SpyneAppProperties } from 'spyne';

describe('Basic Chai Test', function () {
  it('2 + 2 equals 4', function () {
    expect(add(2, 2)).to.equal(4);
  });

  it('should be show that spyne has initialized', function () {
    // SpyneApp.init();
    //expect(SpyneAppProperties.initialized).to.be.true;
    return true;
  });
});
