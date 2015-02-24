//@DarionCassel
Router.configure({
	layoutTemplate: 'ApplicationLayout'
});

Router.onBeforeAction(function () {
	if (!Meteor.user()) {
		this.render('login');
	} else {
		this.next();
	}
});

Router.route('/', function(){
	this.render('Main');
	this.render('footer', {to:'footer'});
});

NotesData = new Mongo.Collection("notes");

if(Meteor.isClient){

	/*new code*/
	Template.login.rendered = function() {
		$("a.initPop").fancybox({
			helpers: {
				overlay: null
			},
			'autoSize': true,
			'closeBtn': false,
			'loop': false,
			'nextSpeed': 2000,
			'nextEffect': 'none'
		});
		//if ($.cookie('modal_shown') == null) {
			//$.cookie('modal_shown', 'yes', { expires: 10000, path: '/' });
			//$('#init1').click();
		//}
		$('#closeWelcome').click(function() {
			$.fancybox.close();
		});
	};
	/*end new*/

	Template.login.events({
		'click button[name=login]': function() {
			var user=randomString(10);
			var pass=randomString(10);
			var color="#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);});
			if (Modernizr.geolocation) {
				navigator.geolocation.getCurrentPosition(setLoc);
				$('#loginBtn').html('Loading...');
			} else {
				$('#loginBtn').html('Error.');
				alert("Error: GPS enabled?");
			}
			function setLoc(position){
				Accounts.createUser({username:user, password:pass, profile: {color: color, loc: [position.coords.longitude, position.coords.latitude]}});
				Meteor.loginWithPassword(user, pass);
				Meteor.subscribe("NotesData_near");
				Meteor.subscribe("Users_self");
				Meteor.subscribe("Users_near");
			}
		}
	});

	Template.footer.events({
		'click #add' : function () {
			if(!$('#noteInput').val().match(/^\s*$/)){
				var note = {
						text: $('#noteInput').val(),
						age: 0,
						color: Meteor.user().profile.color,
						timestamp: moment().format('X'),
						loc: Meteor.user().profile.loc
				};
				Meteor.call('addNote', note);
			}
			$('#noteInput').val('');
			$('#noteInput').focus();
		},
		'keypress input' : function (event) {
			if(event.which===13){
				if(!$('#noteInput').val().match(/^\s*$/)){
					var note = {
						text: $('#noteInput').val(),
						age: 0,
						color: Meteor.user().profile.color,
						timestamp: moment().format('X'),
						loc: Meteor.user().profile.loc
					};
					Meteor.call('addNote', note);
				}
				$('#noteInput').val('');
			}
		}
	});

	Template.footer.helpers({
		users: function() {
			return Meteor.users.find({_id: {$ne: Meteor.userId()}}).fetch();
		}
	});

	Template.main.helpers({
		notes: function() {
			return NotesData.find().fetch();
		}
	});

	Template.note.rendered = function() {
		$('#notesdata').scrollTop($('#notesdata').prop("scrollHeight"));
	}

	Handlebars.registerHelper('linkify',  function(text){
		var linkedText = Autolinker.link(text, {stripPrefix: false});
		var url = new RegExp(/<a\b[^>]*>(.*?)<\/a>/g);
		var str = Handlebars._escape("");
		while(match = url.exec(linkedText)){
			str += Handlebars._escape(linkedText.substring(0, match.index));
			str += linkedText.substring(match.index, match.index+match[0].length);
			linkedText = linkedText.substring(match.index+match[0].length);
			url.lastIndex = 0;
		}
		str += Handlebars._escape(linkedText);
		return new Handlebars.SafeString(str);
	});

	function randomString(num) {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for(var i=0;i<num;i++ ){
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	Tracker.autorun(function() {
		setInterval(function() {
			if(Meteor.user()){
				navigator.geolocation.getCurrentPosition(setLoc);
				function setLoc(position){
					Meteor.users.update({_id: Meteor.userId}, {$set: {loc: [position.coords.longitude, position.coords.latitude]}});
				}
			}
		}, 600000);
		setInterval(function () {
  		Meteor.call('keepalive', Meteor.userId);
		}, 5000);
	});

	Meteor.startup(function() {
		Session.setDefault('document-title', 'noteboard');
		Deps.autorun(function() {
			document.title = Session.get('document-title');
		});
	});

	var focused = true;
	var counter = 0;
	ifvisible.on("blur", function(){
		focused = false;
	});

	ifvisible.on("focus", function(){
		Session.set('document-title', 'noteboard');
		focused = true;
		counter = 0;
	});

	NotesData.find().observe({
		_suppress_initial: true,
		added: function() {
			if(!focused){
				counter++;
				Session.set('document-title', '('+counter+') noteboard');
			}
		}
	});

}
