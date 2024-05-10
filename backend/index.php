<?php
header('Content-Type: application/json');

$host = 'localhost';
$db = 'gis';
$user = 'postgres';
$pass = '1258';

$conn_string = "host=$host dbname=$db user=$user password=$pass";
$dbconn = pg_connect($conn_string);

$requestMethod = $_SERVER["REQUEST_METHOD"];
$requestURI = $_SERVER["REQUEST_URI"];

switch ($requestURI) {
    case '/login':
        if ($requestMethod == 'POST') {
            $result = pg_query_params($dbconn, 'SELECT * FROM Users WHERE email = $1 AND password = $2', [$_POST['email'], $_POST['password']]);
            $data = pg_fetch_all($result);
            echo json_encode($data);
        }
        break;
    case '/monuments':
        if ($requestMethod == 'GET') {
            $result = pg_query($dbconn, 'SELECT * FROM Monuments');
            $data = pg_fetch_all($result);
            echo json_encode($data);
        } elseif ($requestMethod == 'POST') {
            $result = pg_query_params($dbconn, 'INSERT INTO Monuments (name, description, location, user_id) VALUES ($1, $2, $3, $4)', [$_POST['name'], $_POST['description'], $_POST['location'], $_POST['user_id']]);
            echo json_encode(['status' => 'success']);
        }
        break;
    case '/monuments/:id':
        if ($requestMethod == 'GET') {
            $id = explode('/', $requestURI)[2];
            $result = pg_query_params($dbconn, 'SELECT * FROM Monuments WHERE monument_id = $1', [$id]);
            $data = pg_fetch_all($result);
            echo json_encode($data);
        }
        break;
    case '/customMonuments':
        if ($requestMethod == 'GET') {
            $result = pg_query($dbconn, 'SELECT * FROM CustomMonuments');
            $data = pg_fetch_all($result);
            echo json_encode($data);
        } elseif ($requestMethod == 'POST') {
            $result = pg_query_params($dbconn, 'INSERT INTO CustomMonuments (name, description, location, user_id) VALUES ($1, $2, $3, $4)', [$_POST['name'], $_POST['description'], $_POST['location'], $_POST['user_id']]);
            echo json_encode(['status' => 'success']);
        } elseif ($requestMethod == 'DELETE') {
            $result = pg_query_params($dbconn, 'DELETE FROM CustomMonuments WHERE custom_monument_id = $1', [$_DELETE['custom_monument_id']]);
            echo json_encode(['status' => 'success']);
        }
        break;
    case '/favouriteMonuments':
        if ($requestMethod == 'GET') {
            $result = pg_query($dbconn, 'SELECT * FROM FavouriteMonuments');
            $data = pg_fetch_all($result);
            echo json_encode($data);
        } elseif ($requestMethod == 'POST') {
            $result = pg_query_params($dbconn, 'INSERT INTO FavouriteMonuments (user_id, monument_id) VALUES ($1, $2)', [$_POST['user_id'], $_POST['monument_id']]);
            echo json_encode(['status' => 'success']);
        } elseif ($requestMethod == 'DELETE') {
            $result = pg_query_params($dbconn, 'DELETE FROM FavouriteMonuments WHERE user_id = $1 AND monument_id = $2', [$_DELETE['user_id'], $_DELETE['monument_id']]);
            echo json_encode(['status' => 'success']);
        }
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}

pg_close($dbconn);
?>