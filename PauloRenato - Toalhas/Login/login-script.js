// ====== CONTROLE DA ANIMAÇÃO DA INTERFACE ======
const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn.addEventListener("click", () => {
    container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
    container.classList.remove("active");
});


// ====== COMUNICAÇÃO COM O BANCO DE DADOS (BACKEND) ======
const signUpForm = document.getElementById("signUpForm");
const signInForm = document.getElementById("signInForm");

// Evento de Cadastro (Sign Up)
signUpForm.addEventListener("submit", async (e) => {
    e.preventDefault(); 
    
    const formData = new FormData(signUpForm);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch("https://paulo-renato-toalhas.onrender.com/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        alert(result.message);

        if (response.ok) {
            signUpForm.reset();
            container.classList.remove("active"); // Volta para a tela de login
        }
    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        alert("Não foi possível conectar ao servidor backend. Certifique-se de que ele está rodando no terminal.");
    }
});

// Evento de Login (Sign In)
signInForm.addEventListener("submit", async (e) => {
    e.preventDefault(); 
    
    const formData = new FormData(signInForm);
    const data = Object.fromEntries(formData);

    // ... (seu código que dá o e.preventDefault() e cria o const data)

try {
    const response = await fetch("https://paulo-renato-toalhas.onrender.com/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data) // Passa o seu objeto 'data' que já tem o email e a senha certos
    });

    const result = await response.json();
    
    if (response.ok) {
        // 🔑 A PONTE: Salva na memória do navegador que o Admin logou
        localStorage.setItem('paulorenato_admin_logged', 'true');
        
        alert("Login realizado com sucesso! Redirecionando para o catálogo...");
        signInForm.reset();
        
        // 🚀 Redireciona para o index principal (fora da pasta Login) onde a barra do admin vai aparecer
        window.location.href = "../index.html"; 
    } else {
        alert(result.message || "E-mail ou senha incorretos."); 
    }
} catch (error) {
    console.error("Erro ao fazer login:", error);
    alert("Não foi possível conectar ao servidor backend.");
}});