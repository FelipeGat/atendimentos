<?php
require_once __DIR__ . "/util.php";

// Configurações padrão para desenvolvimento (XAMPP)
$host = "localhost";
$usuario = "root";
$senha = "";
$banco = "gestao";

// Detecção automática do ambiente de produção
$isProduction = false;

// Verificar se está em produção através do hostname ou outras variáveis
if (isset($_SERVER['HTTP_HOST'])) {
    $hostname = $_SERVER['HTTP_HOST'];
    if (strpos($hostname, 'investsolucoesdigitais.com.br') !== false) {
        $isProduction = true;
    }
}

// Também verificar através de variáveis de servidor específicas da HostGator
if (isset($_SERVER['SERVER_NAME']) && strpos($_SERVER['SERVER_NAME'], 'investsolucoesdigitais.com.br') !== false) {
    $isProduction = true;
}

// Configurações para produção (HostGator)
if ($isProduction) {
    $host = "localhost";
    $usuario = "inves783_gst";
    $senha = "100%Solucoes";
    $banco = "inves783_gestao";
}

// Criar conexão usando MySQLi
$conn = new mysqli($host, $usuario, $senha, $banco);

// Verificar erro de conexão
if ($conn->connect_error) {
    error_log("Erro de conexão MySQL: " . $conn->connect_error);
    responderErro("Erro na conexão com o banco de dados. Ambiente: " . ($isProduction ? 'Produção' : 'Desenvolvimento'), 500);
}

// Ajustar charset para UTF-8
if (!$conn->set_charset("utf8")) {
    error_log("Erro ao configurar charset UTF-8: " . $conn->error);
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
        global $conn, $host, $usuario, $senha, $banco;
        $this->mysqli_connection = $conn;
        
        // Criar conexão PDO usando as mesmas configurações
        try {
            $dsn = "mysql:host=$host;dbname=$banco;charset=utf8";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8"
            ];
            
            // Usar as mesmas credenciais do MySQLi
            $this->connection = new PDO($dsn, $usuario, $senha, $options);
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
    
    public function isProduction() {
        global $isProduction;
        return $isProduction;
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

// Função para debug (remover em produção)
function debugConnection() {
    global $host, $usuario, $banco, $isProduction;
    error_log("Debug - Ambiente: " . ($isProduction ? 'Produção' : 'Desenvolvimento'));
    error_log("Debug - Host: $host, Usuario: $usuario, Banco: $banco");
}

// Executar debug apenas se não estiver em produção
if (!$isProduction && isset($_GET['debug'])) {
    debugConnection();
}
?>