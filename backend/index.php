<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); // Replace with your actual frontend origin
header("Access-Control-Allow-Methods: GET, POST");

$host = 'localhost';
$db = 'gis';
$user = 'postgres';
$pass = '1258';

$conn_string = "host=$host dbname=$db user=$user password=$pass";
$dbconn = pg_connect($conn_string);

$requestMethod = $_SERVER["REQUEST_METHOD"];
$requestURI = $_SERVER["REQUEST_URI"];
$requestURL = substr($requestURI, 0, strpos($requestURI, '?'));
if ($requestURL == '') {
    $requestURL = $requestURI;
}

switch ($requestURL) {
    case '/signin':
        if ($requestMethod == 'POST') {
            $result = pg_query_params($dbconn, 'INSERT INTO Users (email, password) VALUES ($1, $2)', [
                $_POST['email'],
                $_POST['password']
            ]);

        }
        break;
    case '/login':
        if ($requestMethod == 'POST') {
            $result = pg_query_params($dbconn, 'SELECT * FROM Users WHERE email = $1 AND password = $2', [
                $_POST['email'],
                $_POST['password']
            ]);

            if ($result) {
                $data = pg_fetch_all($result);

                // Check if user is found
                if ($data) {
                    echo json_encode([
                        'status' => '1',
                        'message' => 'User found',
                        'data' => $data
                    ]);
                } else {
                    echo json_encode([
                        'status' => '0',
                        'message' => 'User not found'
                    ]);
                }
            } else {
                echo json_encode([
                    'status' => '0',
                    'message' => 'Query failed'
                ]);
            }
        }

        break;
    case '/monuments':
        if ($requestMethod == 'GET') {
            $result = pg_query($dbconn, 'SELECT * FROM Monuments');
            $data = pg_fetch_all($result);
            $newData = array();
            foreach ($data as $row) {
                // Remove the first field
                array_shift($row);
                // Remove the last field
                array_pop($row);
                array_push($newData, $row);
            }
            echo json_encode($newData);
        } elseif ($requestMethod == 'POST') {
            $result = pg_query_params($dbconn, 'INSERT INTO Monuments (name, description, location, user_id) VALUES ($1, $2, $3,
$4)', [$_POST['name'], $_POST['description'], $_POST['location'], $_POST['user_id']]);
            echo json_encode(['status' => 'success']);
        }
        break;
    case '/customMonuments':
        if ($requestMethod == 'GET') {
            if (isset($_GET['userEmail'])) {
                $email = $_GET['userEmail'];
                $result = pg_query_params($dbconn, 'SELECT user_id FROM Users WHERE email = $1', [$email]);
                $user_id = pg_fetch_result($result, 0, 'user_id');
                $result = pg_query_params($dbconn, 'SELECT * FROM CustomMonuments WHERE user_id = $1', [$user_id]);
                $data = pg_fetch_all($result);
                $newData = array();
                foreach ($data as $row) {
                    array_pop($row);
                    array_push($newData, $row);
                }
                echo json_encode($newData);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Missing userEmail parameter']);
            }
        } elseif ($requestMethod == 'POST') {
            $data = file_get_contents('php://input');
            $data = json_decode($data, true);
            $email = $data['email'];
            $result = pg_query_params($dbconn, 'SELECT user_id FROM Users WHERE email = $1', [$email]);
            $user_id = pg_fetch_result($result, 0, 'user_id');
            $result = pg_query_params($dbconn, 'INSERT INTO CustomMonuments (name, longitude, latitude, description, photo, type, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', [$data['name'], $data['longitude'], $data['latitude'], $data['description'], $data['photo'], $data['type'], $user_id]);
        }
        break;
    case '/deleteCustomMonuments':
        $result = pg_query_params(
            $dbconn,
            'DELETE FROM CustomMonuments WHERE custom_monument_id = $1',
            [$_GET['custom_monument_id']]
        );
        echo json_encode(['status' => 'success']);
        break;
    case '/favouriteMonuments':
        if ($requestMethod == 'GET') {
            $result = pg_query($dbconn, 'SELECT * FROM FavouriteMonuments');
            $data = pg_fetch_all($result);
            echo json_encode($data);
        } elseif ($requestMethod == 'POST') {
            $result = pg_query_params(
                $dbconn,
                'INSERT INTO FavouriteMonuments (user_id, monument_id) VALUES ($1, $2)',
                [$_POST['user_id'], $_POST['monument_id']]
            );
            echo json_encode(['status' => 'success']);
        } elseif ($requestMethod == 'DELETE') {
            $result = pg_query_params(
                $dbconn,
                'DELETE FROM FavouriteMonuments WHERE user_id = $1 AND monument_id = $2',
                [$_DELETE['user_id'], $_DELETE['monument_id']]
            );
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