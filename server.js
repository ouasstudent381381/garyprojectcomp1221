
//Created by Lau Ka Wing 11245125, Yu Lap Chung 11279510, Hu Jun Hao 11269172
var http = require('http');
var url  = require('url');
var assert = require('assert');

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://asstudentnumber2:password123@ds119598.mlab.com:19598/comps381fproject';
//var mongourl = 'mongodb://asstudentnumber1:password123@ds119598.mlab.com:19598/comps381fproject';
//var mongourl = 'mongodb://localhost:27017/test';

var session = require('cookie-session');
var express = require('express');
var fileUpload = require('express-fileupload');
var app = express();
var bodyParser = require('body-parser');
var APIKEY= "265205b890e2aaa6891e881f0bf31274";
// middlewares
app.use(session({cookieName: 'session',keys: ['Lau Ka Wing','Yu Lap Chung', 'Hu Jun Hao']}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));
app.use(fileUpload());

/*************************Login***************************/
app.get('/',function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	}
	else{
		res.redirect('/read');
	}
});

app.post('/login',function(req,res) {
	var user = req.body.name;
	var pw = req.body.pw;	
	var criteria = {"name" : user};
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		findUser(db,criteria,function(result){
			if(result.name == user && result.password == pw){
				req.session.authenticated = true;
				req.session.username = req.body.name;
			}
			res.redirect('/');
		});
	});
});

function findUser(db,criteria,callback) {
	db.collection('user').findOne(criteria,
		function(err,result) {
			assert.equal(err,null);
			callback(result);
		}//end function(err,result) {
	)//end find
}

/*************************Logout***************************/
app.get('/logout', function(req,res,next) {
	req.session = null;
	res.redirect('/');
});

/*************************List restaurant / home***************************/
app.get('/read', function(req,res) {

		var criteria = req.query;
		console.log("Authenticated: " + req.session.authenticated + "; Username: " + req.session.username);
 		MongoClient.connect(mongourl,function(err,db) {
			assert.equal(err,null);
			findRestaurant(db,criteria,function(dbres) {
				db.close();
				res.render('list.ejs',{res:dbres,user:req.session.username,criteria:JSON.stringify(criteria)});
			});
		});
});

//api/read
app.get('/api/read/:field/:value', function(req,res) {
 		MongoClient.connect(mongourl,function(err,db) {
			assert.equal(err,null);	
		var field = req.params.field;
		var value = req.params.value;
		var criteria;
		if (field == "name")
			criteria = { "name" : value };
		if (field == "borough")
			criteria = { "borough" : value };
		if (field == "cuisine")
			criteria = { "cuisine" : value };
			findRestaurant(db,criteria,function(dbres) {
				db.close();
				res.end(JSON.stringify(dbres));
			});
		});
});
function findRestaurant(db,criteria,callback) {
		var dbres = [];
		db.collection('res').find(criteria,function(err,result) {
			assert.equal(err,null);
			result.each(function(err,doc) {
				if (doc != null) {
					dbres.push(doc);
				} else {
					callback(dbres);
				}
			});
		})

}

/*************************show Detail***************************/
app.get('/detail', function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	}
	else{
		var target = req.query.id;
		MongoClient.connect(mongourl,function(err,db) {
			assert.equal(err,null);
			findDetail(db,target,function(dbres) {
				db.close();
				res.render('show.ejs',{rest:dbres});
			});
		});
	}
});

function findDetail(db,target,callback) {
	db.collection('res').findOne({"_id": ObjectId(target)},function(err,result) {
		assert.equal(err,null);
		callback(result);
	});
}

/*************************change***************************/
app.get('/change',function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	}
	else{
		MongoClient.connect(mongourl,function(err,db) {
			assert.equal(err,null);
			changeInfo(db,req.query.id,function(result) {
				db.close();
				if(result.owner!=req.session.username)
					res.sendFile(__dirname + '/public/error.html');
				else{
					res.render('change.ejs',{result:result});
				}
			}//end function(result) 
		);//end changeInfo
		});//end Mongo connect
	}//end authendication
});//end post

function changeInfo(db,target,callback) {
	db.collection('res').findOne({"_id": ObjectId(target)},function(err,result) {
		assert.equal(err,null);
		callback(result);
	});
}

app.post('/change', function(req, res) {
	MongoClient.connect(mongourl,function(err,db) {
	assert.equal(null,err);
		checkName(db,req.body.name,function(result) {
			if(result ==null){
				res.sendFile(__dirname + '/public/error.html');
			}
			else{	
				commitChange(db,req.body.id, req.body.name, req.body.borough, req.body.cuisine, req.body.street, req.body.building, req.body.zipcode, req.body.lon, req.body.lat, req.files.sampleFile,
				function(result) {
			 		db.close();
					res.status(200);
					res.redirect('/detail?id=' + req.body.id);
				}//end function(result) 
			);//end commitChange
			}
		});//end checkName
	});//end Mongo connect
});//end post

function commitChange(db,id,name,borough,cuisine,street,building,zipcode,lon,lat,bfile,callback) {
	if(bfile.name!= ''){
		db.collection('res').update({"_id": ObjectId(id)},{$set:{
		"name" : name,
		"borough" : borough,
	 	"cuisine" : cuisine,
		"street" : street,
		"building" : building,
		"zipcode" : zipcode,
		"coor" : [lon,lat],
		"data" : new Buffer(bfile.data).toString('base64'),
		"mimetype" : bfile.mimetype
		}}, 
			function(err,result) {
				if (err) {
					result = err;
					console.log("Update error: " + JSON.stringify(err));
				}
				callback(result);
			}// end function(err,result)
		);//end insertOne
	}else{
		db.collection('res').update({"_id": ObjectId(id)},{$set:{
		"name" : name,
		"borough" : borough,
	 	"cuisine" : cuisine,
		"street" : street,
		"building" : building,
		"zipcode" : zipcode,
		"coor" : [lon,lat]
		}}, 
			function(err,result) {
				if (err) {
					result = err;
					console.log("Update error: " + JSON.stringify(err));
				}
				callback(result);
			}// end function(err,result)
		);//end insertOne
	}//end if else of empty photo
}//end change

function checkName(db,target,callback) {
	db.collection('res').findOne({"name": target},function(err,result) {
		assert.equal(err,null);
		callback(result);
	});
}

/*************************rate***************************/
app.get('/rate',function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	}
	else{
		var resID = req.query.id;
		res.render('rate.ejs',{res:resID});
	}//end authendication
});

app.post('/rate',function(req,res) {
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		if (! (req.session.username == req.user.name)) {
			addRate(db,req.body.id,req.body.score,req.session.username,
				function(result) {
					db.close();
					res.redirect('/read');
				});
		}//end addRate
      });//end Mongo connect
});//end post

function addRate(db,resID,resScore,rateOwner,callback) {
	db.collection('res').update(
		{"id" : resID},
		{$push:
			{rate: {score :resScore,
				owner:rateOwner}
			}
		}, 
		function(err,result) {
			if (err) {
				result = err;
				console.log("update: " + JSON.stringify(err));
			}
		callback(result);
		}// end function(err,result)
	);//end insertOne
}//end addRate

/*************************Showing map***************************/
app.get('/gmap',function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	}
	else{
		res.render("map.ejs",{lat:req.query.lat,lon:req.query.lon});
	}
});

/*************************Add New Restaurant***************************/
app.get('/new',function(req,res) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	}
	else{
		res.sendFile(__dirname + '/public/create.html');
	}
});

app.post('/create', function(req, res) {
	var sampleFile;
	var criteria = {"name" : req.body.name};
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(null,err);
		findOneRestaurant(db,criteria,function(dbres) {
			if(dbres == null){
				create(db, req.session.username, req.body.name, req.body.borough, req.body.cuisine, req.body.street, req.body.building, req.body.zipcode, req.body.lon, req.body.lat, req.files.sampleFile,
					function(result) {
						db.close();
						if (result.insertedId != null) {
							res.status(200);
							res.sendFile(__dirname + '/public/finish.html');
				  		} else {
							res.status(500);
							res.end(JSON.stringify(result));
						}
					}//end function(result) 
				);//end create
			}
			else{
				res.sendFile(__dirname + '/public/error.html');
			}//end else
		});//end findOneRestaurant
	});//end Mongo connect
});//end post

app.post('/api/create', function(req, res) {
	var criteria = {"name" : req.body.name};
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(null,err);
		findOneRestaurant(db,criteria,function(dbres) {
			if(dbres == null){
				APIcreate(db, req.session.username, req.body.name, req.body.borough, req.body.cuisine, req.body.street, req.body.building, req.body.zipcode, req.body.lon, req.body.lat,
					function(result) {
						db.close();
						if (result.insertedId != null) {
	var str = '{status: ok, _id:'+result.insertedId+'}';
						res.end(JSON.parse(str));
							
				  		} else {
							res.end(JSON.parse('{status: failed}'));
						}
					}//end function(result) 
				);//end create
			}
			else{
				res.sendFile(__dirname + '/public/error.html');
			}//end else
		});//end findOneRestaurant
	});//end Mongo connect
});//end post

function create(db,owner,name,borough,cuisine,street,building,zipcode,lon,lat,bfile,callback) {
	db.collection('res').insertOne({
	"owner" : owner,
	"borough" : borough,
	"name" : name,
 	"cuisine" : cuisine,
	"street" : street,
	"building" : building,
	"coor" : [lon,lat],
	"data" : new Buffer(bfile.data).toString('base64'),
	"mimetype" : bfile.mimetype,
	}, 
		function(err,result) {
			if (err) {
				result = err;
				console.log("insertOne error: " + JSON.stringify(err));
			} else {
		  		console.log("status : OK,");
				console.log("_id : " + result.insertedId);
			}
			callback(result);
		}// end function(err,result)
	);//end insertOne
}//end create

function APIcreate(db,owner,name,borough,cuisine,street,building,zipcode,lon,lat,callback) {
	db.collection('res').insertOne({
	"owner" : owner,
	"borough" : borough,
	"name" : name,
 	"cuisine" : cuisine,
	"street" : street,
	"building" : building,
	"coor" : [lon,lat],
	}, 
		function(err,result) {
			if (err) {
				result = err;
				console.log("insertOne error: " + JSON.stringify(err));
			} else {
		  		console.log("status : OK,");
				console.log("_id : " + result.insertedId);
			}
			callback(result);
		}// end function(err,result)
	);//end insertOne
}//end create

function findOneRestaurant(db,criteria,callback) {
		db.collection('res').findOne(criteria,function(err,result) {
			assert.equal(err,null);
			callback(result);
		}//end function(err,result) {
	);//end find
}
/*************************romve***************************/
app.get('/remove', function(req, res,callback) {
	if (!req.session.authenticated) {
		res.sendFile(__dirname + '/public/login.html');
	}
	else{
		MongoClient.connect(mongourl,function(err,db) {
		assert.equal(null,err);
			deleteRes(db,req.query.id,req.session.username,
				function(result) {
					db.close();
						res.sendFile(__dirname + '/public/finish.html');
				}//end function(result) 
			);//end deleteRes
		});//end Mongo connect
	}
});//end post

function deleteRes(db,target,owner,callback) {
	db.collection('res').remove({"_id": ObjectId(target),"owner" : owner}, 
		function(err,result) {
			if (err) {result = err;}
			callback(result);
		}// end function(err,result)
	);//end remove
}//end deleteRes

/*************************register user***************************/
app.get('/register', function(req,res,callback){
	res.sendFile(__dirname + '/public/register.html');
});

app.post('/register', function(req, res) {
	var criteria = {"name" : req.body.name};
	MongoClient.connect(mongourl,function(err,db) {
	assert.equal(null,err);
		findUser(db,criteria,function(result){	
			if(result == null){
				createUser(db,req.body.name,req.body.pw,
					function(result) {
						db.close();
						res.redirect('/');
					}//end function(result) 
				);//end createUser
			}
			else{
				res.sendFile(__dirname + '/public/error.html');
			}//end else
		});//end FindUser
	});//end Mongo connect
});//end post

function createUser(db,name,pw,callback) {
	db.collection('user').insertOne({
		"name" : name,
		"password" : pw
	}, 
		function(err,result) {
			assert.equal(null,err);
			callback(result);
		}// end function(err,result)
	);//end insertOne
}//end create

app.listen(process.env.PORT || 8099, function() {
  console.log('Server is waiting requests...');
});

