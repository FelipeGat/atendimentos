<?php
require_once __DIR__ . "/util.php";

$host = "localhost";
$usuario = "root";
$senha = "";
$banco = "gestao";

// Criar conexão usando MySQLi
$conn = new mysqli($host, $usuario, $senha, $banco);

// Verificar erro de conexão
if ($conn->connect_error) {
    responderErro("Erro na conexão com o banco de dados: " . $conn->connect_error, 500);
}

// Ajustar charset para UTF-8
if (!$conn->set_charset("utf8")) {
    responderErro("Erro ao configurar charset UTF-8: " . $conn->error, 500);
}
?>
