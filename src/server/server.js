//@DarionCassel
Fiber = Npm.require('fibers');
NotesData = new Mongo.Collection("notes");
MsgCount = new Mongo.Collection("count");

if(Meteor.isServer) {
  Accounts.onLogin(function() {
    Meteor.publish("Users_self", function() {
      self = this;
      if(this.userId){
        return Meteor.users.find({_id: this.userId},
        {fields: {'profile.color': 1, 'profile.loc': 1}});
      }else {
        Kadira.trackError('connectFail', 'FAILURE-1');
      }
    });
    Meteor.publish("Users_near", function() {
      self = this;
      if(this.userId){
        var loc = Meteor.users.findOne(this.userId).profile.loc;
        return Meteor.users.find({
          'profile.loc': {
            $geoWithin: {
              $center: [loc, 0.002699784] //300 meters
            }
          }
        }, {fields:{'profile.color':1}});
      }else {
        Kadira.trackError('connectFail', 'FAILURE-2');
      }
    });
    Meteor.publish("NotesData_near", function() {
      self = this;
      if(this.userId){
        var loc = Meteor.users.findOne(this.userId).profile.loc;
        return NotesData.find({
          loc: {
            $geoWithin: {
              $center: [loc, 0.002699784] //300 meters
            }
          }
        }, {sort: {sortPos: 1}});
      }else {
        Kadira.trackError('connectFail', 'FAILURE-3');
      }
    });
  });

  UserStatus.events.on("connectionLogout", function(fields) {
    Meteor.users.remove({_id: fields.userId});
  });

  UserStatus.events.on("connectionIdle", function(fields) {
    Meteor.users.remove({_id: fields.userId});
  });

  Tracker.autorun(function() {
    Meteor.setInterval(function() {
      Fiber(function(){
        var tempArr = NotesData.find().fetch();
        if(tempArr!=[]){
          for(i=0; i<tempArr.length; i++){
            if(tempArr[i].age!=undefined && tempArr[i].age>59){
              NotesData.remove(tempArr[i]._id);
              /*new code*/
              //to prevent the count from increasing monotonically
              NotesData.update(tempArr[i]._id, {$inc: {sortPos: -1}});
              MsgCount.update({_id: MsgCount.find().fetch()[0]._id}, {$inc: {pos: -1}});
              /*new code*/
            }
          }
        }
      }).run();
    }, 120000);
    Meteor.setInterval(function() {
      Fiber(function(){
        var tempArr = NotesData.find().fetch();
        for(i=0;i<tempArr.length;i++){
          var time = Math.floor((moment().format('X') - tempArr[i].timestamp)/60);
          if(time<=0){time=0;}
          NotesData.update(tempArr[i]._id, {$set: {age: time}});
        }
      }).run();
    }, 10000);
  });

  Meteor.methods({
    addNote: function(note) {
      if(!Meteor.userId()){
        throw new Meteor.Error("not-authorized");
      }else {
        MsgCount.update({_id: MsgCount.find().fetch()[0]._id}, {$inc: {pos: 1}});
        note.sortPos = MsgCount.find().fetch()[0].pos;
        NotesData.insert(note);
      }
    },
    removeAllNotes: function() {
      NotesData.remove({});
    },
    updatePosition: function(userId, position){
      Meteor.users.update({_id: userId}, {$set: {loc: [position.coords.longitude, position.coords.latitude]}});
    }
  });

  Meteor.startup(function() {
    Meteor.users._ensureIndex({'profile.loc': "2d" });
    NotesData._ensureIndex({loc: "2d"});
    if(MsgCount.find().fetch().length==0){
      MsgCount.insert({pos: 0});
    }
  });
}
