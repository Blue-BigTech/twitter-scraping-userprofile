const getList = require('./getusers');
const getProfile = require('./getusersinfo');
async function StartBot(){
    await getList.getusers();
    var start = 0;
    await getProfile.usersProfileDetails(start);
}

StartBot();