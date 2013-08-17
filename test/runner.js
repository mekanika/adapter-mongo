var expect = require('expect.js')
  , mongo = require('../lib/mongo.js')
  , query = require('../../../query/lib/index');


// Bootstrap configures connections and ensures teardown of testDB
// Also exposes bootstrap.reset( adapter, done ) for db reset
var bootstrap = require('./bootstrap/bootstrap.js');
bootstrap( mongo );



describe('Tests', function() {
  // Set query to use the adapter class reference
  after( function() {
    query.adapterClass( mongo.adapter );
  });

  it('should export a Query factory', function() {
    expect( query ).to.be.a( Function );
  });

  it('should initialise the mongo adapter', function() {
    expect( mongo ).to.not.be.empty();
  });
});



describe('adapter', function() {
  // Note: ALL tests should do this. Factor this into general adapter tests



  it('should enable updating config via .configure(options)', function() {
    expect( mongo.configure ).to.be.a( Function );
    var user = mongo.configure().user;
    var newConfig = mongo.configure({user:'hello'});

    expect( user ).to.not.eql( newConfig.user );

    // reset it back to the original value
    mongo.configure( {user:user} );
  });


  describe('.exec( query, cb )', function() {

    it('should expose an .exec() method', function() {
      expect( mongo.exec ).to.be.a( Function );
    });

    // This test checks that direct `query(adapter)...done( fn )` calls
    // correctly queue until the adapter has built a connection to its
    // service - then executing the queued queries
    it('should queue queries until service connection', function(done) {
      // Tiny potential race condition here:
      // We're assuming that the .exec() delegation to .connect()
      // and subsequent mongodb connection establishment will take
      // longer than the synchronous execution of the following calls.
      expect( mongo.raw ).to.be.empty();
      query(mongo).find().from('users').done( cb );
      expect( mongo.raw ).to.be.empty();
      query(mongo).find().from('users').done( cb );

      // At this stage, if no DB is yet connected, queue must be in place
      // for the callbacks to execute
      expect( mongo.raw ).to.be.empty();

      var count = 0;
      function cb( err, res ) {
        if (err) done( err );
        // Both callbacks have executed. Success!
        if (++count === 2) done();
      }
    });

  });


  describe('.connect()', function() {

    it('should return a db handle on connect', function( done ) {
      mongo.connect( function( err, db ) {
        if (err) done( err );

        expect( db ).to.not.be.empty();
        expect( db.admin ).to.be.a( Function );
        done();
      });
    });

    it('should connect to an authenticated db');

  });

});



// Note: Exceptions thrown inside the monogodb.collection.{action}.toArray()
// do NOT propagate back up to Mocha. Must manually catch and pass to done(e)
describe('.find()', function() {

  // Hoist query reference
  var q;

  // Destroy and reset state
  beforeEach( function( done ) {
    q = query('mongo');
    bootstrap.reset( mongo, done );
  });


  it('should return records on a .find() action', function( done ) {
    q
      .find()
      .from('users')
      .done( function(err, res) {
        try {
          expect( res.length ).to.be.greaterThan( 0 );
          done();
        }
        catch( e ) { done( e ); }

      });
  });

  it.skip('should limit records returned on .limit(num)', function( done ) {
    q
      .find()
      .from('users')
      .limit( 1 )
      .done( function( err, res ) {
        try {
          if (err) done( err );
          expect( res.length ).to.be( 1 );
          done();
        }
        catch( e ) { done( e ); }
      });
  });

  it.skip('should conditionally return records .where(age).is(x)', function( done ) {
    q
      .find()
      .from( 'users' )
      .where( 'name' )
        .is( 'Hulk Hogan' )
      .done( function( err, res ) {
        try {
          if (err) done( err );
          expect( res[0].name ).to.be( 'Hulk Hogan' );
          done();
        }
        catch( e ) { done( e ); }
      });
  });


});
