let products = [];
let currentNewProductImage = null; // Guarda a imagem selecionada no modal

// Placeholder local (não depende de serviços externos como via.placeholder.com, que foi desativado)
const SEM_FOTO_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'>
        <rect width='100%' height='100%' fill='#f0f0f0'/>
        <text x='50%' y='50%' font-family='Montserrat, sans-serif' font-size='18' fill='#aaa' text-anchor='middle' dominant-baseline='middle'>Sem Foto</text>
    </svg>`
);

async function loadAdminCatalog() {
    try {
        const response = await fetch("https://paulo-renato-toalhas.onrender.com/api/toalhas");
        if (!response.ok) throw new Error();
        products = await response.json();
        renderAdminGrid();
    } catch (error) {
        console.error("Erro de conexão backend:", error);
    }
}

function renderAdminGrid() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;
    grid.innerHTML = '';

    products.forEach(p => {
        let precosHTML = `<div class="price-container-grid">`;
        
        const listaVariacoes = p.variations && p.variations.length > 0 
            ? p.variations 
            : [{size: 'Varejo', price: 0}, {size: 'Atacado', price: 0}];
        
        listaVariacoes.forEach((v, idx) => {
            precosHTML += `
                <div class="price-block" onclick="editPrice(${p.id}, ${idx})">
                    <span class="price-label">${v.size}</span>
                    <span class="price-value">R$ ${parseFloat(v.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                ${idx === 0 ? '<span class="price-divider">|</span>' : ''}
            `;
        });
        precosHTML += `</div>`;

        const imagemCapa = (p.images && p.images.length > 0 && p.images[0]) 
            ? p.images[0] 
            : SEM_FOTO_PLACEHOLDER;

        grid.innerHTML += `
            <div class="product-card" style="position:relative;">
                <label class="action-btn add-photo-btn" title="Mudar Foto" style="cursor:pointer;">
                    📷
                    <input type="file" accept="image/*" style="display:none;" onchange="changeProductImage(event, ${p.id})">
                </label>
                
                <button class="action-btn delete-btn" onclick="deleteProduct(${p.id})" title="Excluir Produto">🗑️</button>
                
                <img src="${imagemCapa}" alt="${p.name}">
                
                <h3 onclick="editProductName(${p.id})" style="cursor:pointer;" title="Clique para editar o nome">${p.name} ✏️</h3>
                
                ${precosHTML}
            </div>
        `;
    });
}

// EDITAR NOME DO PRODUTO
async function editProductName(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const novoNome = prompt("Digite o novo nome do produto:", prod.name);
    if (!novoNome || novoNome.trim() === "") return;

    prod.name = novoNome.trim();

    const response = await fetch("https://paulo-renato-toalhas.onrender.com/api/toalhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prod)
    });

    if (response.ok) {
        loadAdminCatalog();
    }
}

// ALTERAR VALORES VIA PROMPT
async function editPrice(productId, variationIdx) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const novoPrecoStr = prompt(`Digite o novo preço para ${prod.variations[variationIdx].size}:`, prod.variations[variationIdx].price);
    if (novoPrecoStr === null) return;

    const novoPreco = parseFloat(novoPrecoStr.replace(',', '.'));
    if (isNaN(novoPreco)) return alert("Valor inválido.");

    prod.variations[variationIdx].price = novoPreco;

    const response = await fetch("https://paulo-renato-toalhas.onrender.com/api/toalhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prod)
    });

    if (response.ok) {
        loadAdminCatalog();
    }
}

// TROCAR FOTO DO PRODUTO EXISTENTE
function changeProductImage(event, productId) {
    const file = event.target.files[0];
    if (!file) return;

    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
        prod.images = [reader.result]; 

        const response = await fetch("https://paulo-renato-toalhas.onrender.com/api/toalhas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prod)
        });

        if (response.ok) {
            alert("Foto atualizada com sucesso!");
            loadAdminCatalog();
        } else {
            alert("Erro ao salvar a imagem.");
        }
    };
    reader.readAsDataURL(file);
}

// EXCLUIR PRODUTO DO BANCO
async function deleteProduct(productId) {
    if (!confirm("Tem certeza que deseja excluir permanentemente este produto do catálogo?")) return;

    try {
        const response = await fetch(`https://paulo-renato-toalhas.onrender.com/api/toalhas/${productId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            alert("Produto removido com sucesso!");
            loadAdminCatalog(); 
        } else {
            alert("Erro ao deletar o produto.");
        }
    } catch (error) {
        alert("Erro ao conectar com o servidor.");
    }
}

// ============================================================
// NOVAS FUNÇÕES PARA O MODAL DE ADICIONAR PRODUTO (CORRIGIDO)
// ============================================================

// Abre ou fecha a janela modal
function toggleNewProductModal(show) {
    const modal = document.getElementById('newProductModal');
    if (show) {
        modal.style.display = 'flex';
        clearNewProductForm(); // Limpa o formulário ao abrir
    } else {
        modal.style.display = 'none';
    }
}

// Mostra um preview da imagem selecionada dentro do modal
function previewNewProductImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const placeholder = document.getElementById('newProdPhotoPlaceholder');
    
    reader.onloadend = () => {
        currentNewProductImage = reader.result; // Salva o Base64 na variável global
        // Coloca a imagem como fundo do placeholder
        placeholder.style.backgroundImage = `url(${currentNewProductImage})`;
        placeholder.style.borderStyle = 'solid';
        placeholder.style.borderColor = '#0bcbe2';
        // Esconde o ícone e o texto
        placeholder.querySelector('i').style.display = 'none';
        placeholder.querySelector('span').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Limpa os campos do formulário do modal
function clearNewProductForm() {
    document.getElementById('newProdName').value = '';
    document.getElementById('newProdVarejo').value = '';
    document.getElementById('newProdAtacado').value = '';
    document.getElementById('newProdFile').value = ''; // Limpa o input file
    currentNewProductImage = null;
    
    const placeholder = document.getElementById('newProdPhotoPlaceholder');
    placeholder.style.backgroundImage = 'none';
    placeholder.style.borderStyle = 'dashed';
    placeholder.style.borderColor = '#ccc';
    placeholder.style.color = '#888';
    placeholder.querySelector('i').style.display = 'block';
    placeholder.querySelector('span').style.display = 'block';
}

// Salva o novo produto pegando os dados do modal
async function saveNewProduct() {
    const nome = document.getElementById('newProdName').value.trim();
    const varejo = parseFloat(document.getElementById('newProdVarejo').value) || 0;
    const atacado = parseFloat(document.getElementById('newProdAtacado').value) || 0;

    // Validações básicas
    if (!nome) return alert("Por favor, digite o nome do produto.");
    if (!currentNewProductImage) return alert("Por favor, selecione uma foto para o produto.");

    const novoProduto = {
        name: nome,
        desc: "Produto de alta qualidade e durabilidade comercializado pela PAULO RENATO REPRESENTAÇÕES.",
        images: [currentNewProductImage],
        availableTypes: [], 
        variations: [
            { size: "Varejo", price: varejo },
            { size: "Atacado", price: atacado }
        ]
    };

    try {
        const response = await fetch("https://paulo-renato-toalhas.onrender.com/api/toalhas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novoProduto)
        });

        if (response.ok) {
            alert("Produto cadastrado com sucesso!");
            toggleNewProductModal(false); // Fecha o modal
            loadAdminCatalog(); // Recarrega o catálogo
        } else {
            alert("Erro ao salvar o produto no MySQL. Verifique o tamanho da foto.");
        }
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro de conexão com o servidor.");
    }
}

// Fecha o modal se clicar fora da área branca
window.onclick = function(event) {
    const modal = document.getElementById('newProductModal');
    if (event.target == modal) {
        toggleNewProductModal(false);
    }
}

document.addEventListener("DOMContentLoaded", loadAdminCatalog);