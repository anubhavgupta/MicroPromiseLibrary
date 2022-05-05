
LaterMaker.reject(100)
    .catch((val)=>{
        console.log(val, 'fail');
        return 200;
    })
    .then((val)=>{
        console.log(val, 'catchThen');
    });


const promise = new LaterMaker((res, rej)=>{
    setTimeout(()=>{
        res(100)
    }, 1000);
});


promise
    .then((val)=>{
        console.log(val, 'success');
    })
    .finally(()=>{
        console.log('finally called');
    });

    