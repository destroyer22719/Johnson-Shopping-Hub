const expect = require('chai').expect;
const sinon = require('sinon');
const User = require('../models/user');
const AuthController = require('../controllers/auth');
const mongoose = require('mongoose')
describe('Auth controller', function() {
    before(function(done) {
        mongoose
        .connect(
          'mongodb+srv://Nathan:G9AMNtVnuJSwF5ch@cluster0.umvyt.mongodb.net/mocha?retryWrites=true&w=majority'
          )
        .then(result => {
            const user = new User({
                email:'mocha@test.com',
                password:'tester',
                name:'Testing',
                posts:[],
                _id:'5f2457c37e125f5bf0f83715'
            })
            return user.save()
        })
        .then(() => {
            done()
        })
    })
    it('should throw an error with code 500 if accessing the database fails',(done) => {
        sinon.stub(User, 'findOne');
        User.findOne.throws();
        
        const req = {
            body:{
                email:'test@test.com',
                password:'test'
            }
        }

        AuthController.login(req, {}, () => {})
        .then(result => {
            // console.log(result)
            expect(result).to.be.an('error');
            expect(result).to.have.property('statusCode', 500);
            done()
        })

        
        User.findOne.restore();
    });
    beforeEach(function(){
        
    })
    afterEach(function(){
        
    })
    it('should send a response with a valid user status for an existing user', (done) => {

            const req = {userId:'5f2457c37e125f5bf0f83715'}
            const res = {
                statusCode:500,
                userStatus:null,
                status:function(code){
                    this.statusCode = code;
                    return this;
                },
                json:function(data){
                    this.userStatus = data.status
                }
            }
            AuthController.getUserStatus(req, res, () => {}).then(() => {
                expect(res.statusCode).to.be.equal(200);
                expect(res.userStatus).to.be.equal('I am new!');
                done()
            })
        })
        after(function(done){
            User.deleteMany({})
            .then(() => {
                mongoose.disconnect()

            })
            .then(() => {
                done();
            })
        })
    })
