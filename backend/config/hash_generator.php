<?php
// A senha que você quer usar
$senha_clara = '7410';

// Gerar o hash da senha
$senha_hash = password_hash($senha_clara, PASSWORD_DEFAULT);

// Exibir o hash da senha
echo "O hash da sua senha é: " . $senha_hash;
?>