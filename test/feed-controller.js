const expect = require('chai').expect;
const sinon = require('sinon');
const User = require('../models/user');
const FeedController = require('../controllers/feed');
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
    it('should add a created post to the posts of the creator',(done) => {
        
        const req = {
            body:{
                title:'Test Post',
                content:'A test post',
            },
            file:{
                path:'abc'
            },
            userId:'5f2457c37e125f5bf0f83715'
        }
        const res = {status:function(){return this}, json:function(){}}
        FeedController.createPost(req, res, () => {}).then((savedUser) => {
            expect(savedUser).to.have.property('posts');
            expect(savedUser.posts).to.have.length(1);
            done()
        })
    });    
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