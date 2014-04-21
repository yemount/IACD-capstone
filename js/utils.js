// helpers for saving data through ajax requests

function saveMap(name, data){
    $.ajax({
        type: 'POST',
        url: 'http://localhost/saveImage.php',
        data: {
            img: data,
            filename: name
        }
    }).done(function(o){
        console.log('saved map ' + name + '!');
    });
}

function saveCSV(name, data){
    $.ajax({
        type: 'POST',
        url: 'http://localhost/saveCSV.php',
        data: {
            filestr: data,
            filename: name
        }
    }).done(function(o){
        console.log('saved file ' + name + '!');
    })
}