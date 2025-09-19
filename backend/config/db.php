<?php
require_once __DIR__ . "/util.php";

$host = "localhost";
$usuario = "root";
$senha = "";
$banco = "gestao";

// Criar conexão usando MySQLi (mantendo compatibilidade)
$conn = new mysqli($host, $usuario, $senha, $banco);

// Verificar erro de conexão
if ($conn->connect_error) {
    responderErro("Erro na conexão com o banco de dados: " . $conn->connect_error, 500);
}

// Ajustar charset para UTF-8
if (!$conn->set_charset("utf8")) {
    responderErro("Erro ao configurar charset UTF-8: " . $conn->error, 500);
}

/**
 * Classe Database compatível com código existente
 * Mantém a conexão MySQLi existente mas adiciona suporte PDO quando necessário
 */
class Database {
    private static $instance = null;
    private $connection;
    private $mysqli_connection;
    
    private function __construct() {
        global $conn;
        $this->mysqli_connection = $conn;
        
        // Criar conexão PDO usando as mesmas configurações
        try {
            $dsn = "mysql:host=localhost;dbname=gestao;charset=utf8";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8"
            ];
            
            // Usar as mesmas credenciais do MySQLi
            $this->connection = new PDO($dsn, "root", "", $options);
        } catch (PDOException $e) {
            error_log("Erro de conexão PDO: " . $e->getMessage());
            throw new Exception("Erro ao estabelecer conexão PDO: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function getMysqliConnection() {
        return $this->mysqli_connection;
    }
}

// Função para obter conexão PDO (para classe Orcamento)
function getConnection() {
    try {
        return Database::getInstance()->getConnection();
    } catch (Exception $e) {
        error_log("Erro ao obter conexão PDO: " . $e->getMessage());
        return null;
    }
}
?>

