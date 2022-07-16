/*

[DMTOON] BACKEND GAME LUCKY NUMBER

*/

var TIME_LIMIT = 10; //10 seconds before random number
var SLEEP_TIME = 5; //5 seconds for send reward before start next turn

function User(id, money, betValue)
{
    this.id = id; // Keep connection id (Socket id)
    this.money = money; //Keep user money 
    this.betValue = betValue; // Keep user bet value 
}

var ArrayList = require('arraylist');
const { count } = require('console');

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//Create list of user playing
var listUsers = new ArrayList;

var money = 0; //TOTAL money bet on server

//CREATE SERVER
app.get('/', function(req,res){
    
    res.sendFile('index.html',{root: __dirname})// When user use GET method, return an default index
    
});

function getRandomInt(max)
{
    return Math.floor(Math.random()*Math.floor(max)); //Create random int from 0 to max 
}

function sleep(sec)
{
    return new Promise(resolve => setTimeout(resolve,sec*1000));// Sleep
}

async function countDown() //Broad cast count down timer for all client
{ 
    var timeTotal = TIME_LIMIT;
    do{
        //send Timer to all client
        io.sockets.emit('broadcast',timeTotal);
        timeTotal--;
        await sleep(1); // Sleep 1 second;
    }while(timeTotal > 0);

    //after time limit is finish
    processResult(); //Send rewar money  for winer

    //Reset data for next turn
    timerTotal = TIME_LIMIT;
    money = 0;
    io.sockets.emit('wait_before_restart', SLEEP_TIME); // Send message wait server calculated result before next turn
    io.sockets.emit('money_send', 0); // send total of money to all user (next turn default is 0)
    await sleep(SLEEP_TIME); // wait

    io.sockets.emit('restart', 1) // Send message next turn for all client (don't care about 1 you can use any number)
    
    countDown();

}

function processResult()
{
    console.log('Server is processing data');
    var resulst = getRandomInt(2);
    console.log('\x1b]33m%s','Lucky Number: ' +resulst); //Yellow text
    io.sockets.emit('result',resulst); //Send lucky number to client

    //Because we only accept 1 times bet in turn, so we will remove all duplicated data
    //Of course, in client app, we will prevent this case, don't worry

    listUsers.unique();

    // Count in list User playing how many winners
    var count = listUsers.find(function(user){
        return user.betValue == resulst;
    }).length;

    //Now, just find winner and loser to send reward
    listUsers.find(function(user){
        if(user.betValue == resulst)
            io.to(user.id).emit('reward',parseInt(user.money)*2); // We will multiple money bet of user for reward
        else
            io.to(user.id).emit('lose',user.money);
    });

    console.log('\x1b[32m','we have '+count+' people(s) are winner');

    listUsers.clear();


}


io.on('connection',function(socket){

    console.log('A new user ' +socket.id+'is Connected');

    io.sockets.emit('money_send',money); //As soon as user logged on server , we will send sum of money of this turn to him

    socket.on('client_send_money',function(objectClient)
    {
        //when user place a bet, we will get money and increase our total money
        console.log(objectClient); //print objectClient (json format)
        var user = new User(socket.id, objectClient.money, objectClient.betValue);

        console.log('We create: '+user.money+' from '+ user.id);
        console.log('User: '+user.id+' bet value '+user.betValue);

        money+=parseInt(user.money);

        console.log('=x1b[42m','Sum of money: '+money); //Update on our server

        //Save user to list user online
        listUsers.add(user);
        console.log('Total online users: ' + listUsers.length);

        //send update money to all user
        io.sockets.emit('money_send',money);
    });

    // When ever someone disconnects
    socket.on('disconnect', function(socket){
        console.log('User '+socket.id+' is leave');
    });
    
});


//Start Server
http.listen(3000, function(){
    console.log('START GAME STARTED ON PORT: 3000');

    countDown();
})



