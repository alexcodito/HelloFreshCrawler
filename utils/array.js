// Spit array into chuncks of specified size
const splitArrayBatch = function (arr, chunkSize) {
    var R = [];
    for (var i=0,len=arr.length; i<len; i+=chunkSize)
      R.push(arr.slice(i,i+chunkSize));
    return R;
}

module.exports = {
    splitArrayBatch
}