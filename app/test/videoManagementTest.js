const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app');
var bcrypt = require('bcrypt');

const mysql = require('mysql');
const connection = mysql.createConnection(require('../routes/connection.json'));

chai.should();
chai.use(chaiHttp);

const agent = chai.request.agent(server);

describe.skip('Video Management', () => {
   let studentCookie;
   let adminCookie;
   let defaultAdminCookie;

   before('create an admin and student user account', (done) => {
      connection.connect(function (err) {
         if (err)
            throw new Error('Unable to connect to database!');
      });

      let adminUser = {
         'firstName': 'Jake',
         'lastName': 'Admin',
         'email': 'Jake@admin.com',
         'role': 1,
         'passHash': bcrypt.hashSync('password', 10),
         'termsAccepted': new Date()
      };

      let studentUser = {
         'firstName': 'Jake',
         'lastName': 'Student',
         'email': 'jake@student.com',
         'role': 0,
         'passHash': bcrypt.hashSync('password', 10),
         'termsAccepted': new Date()
      };

      connection.query('insert into User set ?', adminUser);
      connection.query('insert into User set ?', studentUser, function() {
         done();
      });
   });

   after('remove Users and reset auto_increment', (done) => {
      let defaultAdmin = {
         'firstName': 'Joe',
         'lastName': 'Admin',
         'email': 'admin@example.com',
         'role': 1,
         'passHash': '$2a$10$Nq2f5SyrbQL2R0e9E.cU2OSjqqORgnwwsY1vBvVhV.SGlfzpfYvyi',
         'termsAccepted': new Date()
      };

      connection.query('delete from User');
      connection.query('alter table User auto_increment=1');
      connection.query('insert into User set ?', defaultAdmin, function (err) {
         if (err) throw err;

         done();
      });
   });


   describe('Log in as a student', () => {
      it('results in a POST for a new session', (done) => {
         let session = {
            'email': 'jake@student.com',
            'password': 'password'
         };

         agent
            .post('/Session')
            .send(session)
            .end((err, res) => {
               res.should.have.status(200);
               res.body.should.be.empty;
               res.should.have.cookie('SPAuth');

               // save cookie for getting Session by cookie
               studentCookie = res.header.location.replace('/Session/', '');

               done();
            });
      });
   });

   describe('/GET 0 videos', () => {
      it('results in 200 and empty array', (done) => {
         
         agent
            .get('/Video')
            .end((err, res) => {
               res.should.have.status(200);
               res.body.should.be.a('array');
               res.body.should.have.lengthOf(0);
               done();
            });
      });
   });

   describe('/POST video as a non-admin', () => {
      it('results in 401', (done) => {
         
         let videoData = {
            'name': 'video0',
            'link': 'http://example.com',
            'topicId': 1,
            'dueDate': new Date()
         }

         agent
            .post('/Video')
            .send(videoData)
            .end((err, res) => {
               res.should.have.status(401);
               res.body.should.be.a('array');
               res.body.should.have.lengthOf(0);
               done();
            });
      });
   });

   describe('/POST video as an admin', () => {
      it('Logs in as admin', (done) => {
         let session = {
            'email': 'jake@admin.com',
            'password': 'password'
         };

         agent
            .post('/Session')
            .send(session)
            .end((err, res) => {
               res.should.have.status(200);
               res.body.should.be.empty;
               res.should.have.cookie('SPAuth');

               // save cookie for getting Session by cookie
               studentCookie = res.header.location.replace('/Session/', '');

               done();
            });
      });

      it('results in successful video creation', (done) => {
         
         let videoData = {
            'name': 'video1',
            'link': 'http://example.com',
            'topicId': 1,
            'dueDate': new Date()
         }

         agent
            .post('/Video')
            .send(videoData)
            .end((err, res) => {
               res.should.have.status(200);
               done();
            });
      });
   });

   describe('/POST 2nd video as an admin', () => {
      it('results in successful video creation', (done) => {
         
         let videoData = {
            'name': 'video2',
            'link': 'http://example.com',
            'topicId': 1,
            'dueDate': new Date()
         }

         agent
            .post('/Video')
            .send(videoData)
            .end((err, res) => {
               res.should.have.status(200);
               done();
            });
      });
   });

   describe('/GET 2 videos', () => {
      it('results in 200 and 2 videos returned', (done) => {
         agent
            .get('/Video')
            .end((err, res) => {
               res.should.have.status(200);
               res.body.should.be.a('array');
               res.body.should.have.lengthOf(2);
               res.body[0].should.have.property('link', 'http://example.com');
               done();
            });
      });
   });

   describe('/GET /video/2', () => {
      it('results in 200 and returns video with id = 2', (done) => {
         agent
            .get('/Video/2')
            .end((err, res) => {
               res.should.have.status(200);
               res.body.should.have.lengthOf(1);
               res.body.should.have.property('id', 2);
               res.body.should.have.property('link', 'http://example.com');
               done();
            });
      });
   });

   describe('/PUT update /video/:id', () => {
      it('results in 200 and updates name of video 1', (done) => {

         let videoUpdateInfo = {
            'name': 'video1UpdatedName',
            'link': 'http://example.com/updated'
         }

         agent
            .put('/Video/1')
            .end((err, res) => {
               res.should.have.status(200);
               done();
            });
      });
   });

   describe('/GET /video/1', () => {
      it('results in 200 and confirms the updates to video 1', (done) => {
         agent
            .get('/Video/1')
            .end((err, res) => {
               res.should.have.status(200);
               res.body.should.have.lengthOf(1);
               res.body.should.have.property('id', 1);
               res.body.should.have.property('name', 'video1UpdatedName')
               res.body.should.have.property('link', 'http://example.com');
               done();
            });
      });
   });

   describe('/DELETE /video/1', () => {
      it('results in 200 and deletes video 1', (done) => {
         agent
            .delete('/Video/1')
            .end((err, res) => {
               res.should.have.status(200);
               done();
            });
      });
   });

   describe('/GET 1 video', () => {
      it('results in 200 and 1 video returned', (done) => {
         agent
            .get('/Video')
            .end((err, res) => {
               res.should.have.status(200);
               res.body.should.be.a('array');
               res.body.should.have.lengthOf(1);
               res.body[0].should.have.property('id', 2);
               done();
            });
      });
   });

   describe('/GET /video/1 will not work', () => {
      it('results in 404 because video was deleted', (done) => {
         agent
            .get('/Video/1')
            .end((err, res) => {
               res.should.have.status(404);
               
               done();
            });
      });
   });


});