import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import './Login.css';

import loginIllustration from '../assets/login-illustration.png';

import logo1 from '../assets/delta.png';

import logo2 from '../assets/gw-logo.jpg';

import logo3 from '../assets/invest.jpg';



const Login = () => {

    const [email, setEmail] = useState('');

    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');

    const [rememberMe, setRememberMe] = useState(false);

    const navigate = useNavigate();



    const handleSubmit = async (event) => {

        event.preventDefault();

        setError('');

        setLoading(true);



        // Validação básica no frontend

        if (!email.trim()) {

            setError('Email é obrigatório');

            setLoading(false);

            return;

        }



        if (!password.trim()) {

            setError('Senha é obrigatória');

            setLoading(false);

            return;

        }



        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

            setError('Email inválido');

            setLoading(false);

            return;

        }



        try {

            const response = await fetch('http://localhost/Atendimentos/backend/api/login.php', {

                method: 'POST',

                headers: {

                    'Content-Type': 'application/json',

                },

                body: JSON.stringify({

                    email: email.trim(),

                    password: password.trim()

                })

            });



            const data = await response.json();



            if (response.ok && data.message === "Login realizado com sucesso") {

                console.log('Login bem-sucedido!', data.data);



                const userData = {

                    id: data.data.usuario.id,

                    nome: data.data.usuario.nome,

                    email: data.data.usuario.email,

                    perfil: data.data.usuario.perfil,

                    foto: data.data.usuario.foto,

                    token: data.data.token

                };



                if (rememberMe) {

                    localStorage.setItem('user', JSON.stringify(userData));

                } else {

                    sessionStorage.setItem('user', JSON.stringify(userData));

                }



                // Redirecionar para o dashboard

                navigate('/dashboard');

            } else {

                // Erro de autenticação

                setError(data.mensagem || 'Erro ao fazer login');

            }

        } catch (error) {

            console.error('Erro na requisição:', error);

            setError('Erro de conexão. Tente novamente.');

        } finally {

            setLoading(false);

        }

    };



    // Limpar erro quando o usuário digitar

    const handleEmailChange = (e) => {

        setEmail(e.target.value);

        if (error) setError('');

    };



    const handlePasswordChange = (e) => {

        setPassword(e.target.value);

        if (error) setError('');

    };



    return (

        <div className='app-container'>

            <div className="login-page">

                {/* Lado esquerdo */}

                <div className="login-half-background">

                    <div className="login-form-container">

                        <div className="login-header">

                            <h1>Bem Vindo</h1>

                        </div>

                        <form onSubmit={handleSubmit}>

                            {error && (

                                <div className="error-message">

                                    {error}

                                </div>

                            )}

                            <div className="input-group">

                                <input

                                    type="email"

                                    placeholder="Email"

                                    value={email}

                                    onChange={handleEmailChange}

                                    disabled={loading}

                                    required

                                />

                            </div>

                            <div className="input-group">

                                <input

                                    type="password"

                                    placeholder="Senha"

                                    value={password}

                                    onChange={handlePasswordChange}

                                    disabled={loading}

                                    required

                                />

                            </div>

                            <div className="remember-forgot">

                                <label>

                                    <input

                                        type="checkbox"

                                        checked={rememberMe}

                                        onChange={(e) => setRememberMe(e.target.checked)}

                                        disabled={loading}

                                    />

                                    Relembre-me

                                </label>

                                <a href="#" onClick={(e) => e.preventDefault()}>

                                    Esqueceu a Senha?

                                </a>

                            </div>

                            <button

                                type="submit"

                                className="submit-button"

                                disabled={loading}

                            >

                                {loading ? 'Entrando...' : 'Entrar'}

                            </button>

                        </form>

                    </div>

                </div>



                {/* Lado direito */}

                <div className="login-half-illustration">

                    <div className="login-header-illustration">

                        <h1>Grupos Soluções</h1>

                    </div>



                    <div className="illustration">

                        <img

                            src={loginIllustration}

                            alt="Pessoas trabalhando com o sistema"

                        />

                    </div>



                    {/* Logos no rodapé */}

                    <div className="logos-container">

                        <img src={logo1} alt="Delta Soluções" className="logo" />

                        <img src={logo2} alt="GW Soluções" className="logo" />

                        <img src={logo3} alt="Investimentos" className="logo" />

                    </div>

                </div>

            </div>

        </div>

    );

};



export default Login;