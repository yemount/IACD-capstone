<?php 
    define('UPLOAD_DIR', 'mapdata/');
    $data = $_POST['filestr'];
    $file = UPLOAD_DIR . $_POST['filename'] . '.csv';
    $success = file_put_contents($file, $data);
    print $success ? $file : 'Unable to save the file.';
?>