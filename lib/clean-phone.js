
module.exports = cleanPhone

function cleanPhone(phone){
 return '+'+(phone+'').replace(/[^\d]/g,'')
}
