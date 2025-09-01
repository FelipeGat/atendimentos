<?php
// Configuração simplificada do banco de dados
// Substitua pelas suas configurações reais

$host = 'localhost';        // Host do banco (geralmente localhost no XAMPP)
$dbname = 'atendimento';    // Nome do seu banco de dados
$username = 'root';         // Usuário do MySQL (geralmente root no XAMPP)
$password = '';             // Senha do MySQL (geralmente vazia no XAMPP)
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    // A variável $pdo é criada e estará disponível para qualquer script que inclua este arquivo.
    $pdo = new PDO($dsn, $username, $password, $options);
    
    // Teste básico de conexão
    $pdo->query("SELECT 1");
    
} catch (PDOException $e) {
    // Em caso de erro, mostra uma mensagem mais detalhada para debug
    $error_message = "Erro de conexão com o banco de dados: " . $e->getMessage();
    
    // Se estivermos em modo de desenvolvimento, mostra mais detalhes
    if (isset($_GET['debug']) || php_sapi_name() === 'cli') {
        $error_message .= "\n\nDetalhes da configuração:";
        $error_message .= "\nHost: " . $host;
        $error_message .= "\nBanco: " . $dbname;
        $error_message .= "\nUsuário: " . $username;
        $error_message .= "\nSenha: " . (empty($password) ? '(vazia)' : '(definida)');
    }
    
    throw new PDOException($error_message, (int)$e->getCode());
}
?>

