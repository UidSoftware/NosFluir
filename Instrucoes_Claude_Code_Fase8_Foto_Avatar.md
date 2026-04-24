# Instrucoes_Claude_Code_Fase8_Foto_Avatar.md
# Nos Studio Fluir — Uid Software
# Feature: Upload de Foto de Perfil com Cloudinary
# ✅ COMPLETO E EM PRODUÇÃO (24/04/2026)

---

## ⚠️ ANTES DE COMEÇAR

Adicionar no `.env` da VPS (`/var/www/studio-fluir/.env`):
```
CLOUDINARY_CLOUD_NAME=seu_cloud_name   ← é o nome do cloud, NÃO o nome da chave API
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

> ⚠️ **Armadilha real:** O `CLOUDINARY_CLOUD_NAME` é o identificador do cloud (ex: `dpqy5shqz`),
> visível no topo do painel Cloudinary em "Cloud name: xxxxx".
> NÃO é o nome que você deu à chave API (ex: "Uid_Software").
> Erro resultante: `Invalid cloud_name Uid_Software`

> ⚠️ **Adicionar também no `docker-compose.yml`** — as vars do `.env` não chegam ao container
> automaticamente sem estarem declaradas na seção `environment` do backend.

---

## Contexto

Usuário pode fazer upload de foto de perfil.
Sem foto → exibe iniciais do nome.
Com foto → exibe a foto.
Foto fica armazenada no Cloudinary na pasta `nosfluir/avatars/`.

---

## ETAPA 1 — Backend

### 1.1 — Instalar dependência

Adicionar ao `requirements.txt`:
```
cloudinary==1.36.0
```

---

### 1.2 — Configurar Cloudinary no `settings.py`

```python
# settings.py — no topo
import cloudinary

# No final do arquivo
cloudinary.config(
    cloud_name=config('CLOUDINARY_CLOUD_NAME', default=''),
    api_key=config('CLOUDINARY_API_KEY', default=''),
    api_secret=config('CLOUDINARY_API_SECRET', default=''),
    secure=True,
)
```
> Usar `config()` do python-decouple (já usado no projeto), não `os.environ.get()`

---

### 1.3 — Campo `foto_url` no model `User`

```python
# apps/usuarios/models.py
foto_url = models.URLField(max_length=500, null=True, blank=True)
```

**Migration:** `0002_foto_avatar_user_foto_url`

---

### 1.4 — Endpoints de upload e remoção

```python
# apps/usuarios/views.py

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_foto(request):
    arquivo = request.FILES.get('foto')
    if not arquivo:
        return Response({'error': 'Nenhum arquivo enviado.'}, status=400)
    if arquivo.content_type not in ['image/jpeg', 'image/png']:
        return Response({'error': 'Formato inválido. Use JPG ou PNG.'}, status=400)
    if arquivo.size > 2 * 1024 * 1024:
        return Response({'error': 'Arquivo muito grande. Máximo 2MB.'}, status=400)
    try:
        resultado = cloudinary.uploader.upload(
            arquivo,
            folder='nosfluir/avatars',
            public_id=f'user_{request.user.id}',
            overwrite=True,
            transformation=[{'width': 200, 'height': 200, 'crop': 'fill', 'gravity': 'face'}]
        )
        request.user.foto_url = resultado['secure_url']
        request.user.save(update_fields=['foto_url'])
        return Response({'foto_url': resultado['secure_url']})
    except Exception as e:
        return Response({'error': f'Erro no upload: {str(e)}'}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remover_foto(request):
    if request.user.foto_url:
        cloudinary.uploader.destroy(f'nosfluir/avatars/user_{request.user.id}')
        request.user.foto_url = None
        request.user.save(update_fields=['foto_url'])
    return Response({'message': 'Foto removida com sucesso.'})
```

---

### 1.5 — URLs

```python
# apps/usuarios/urls.py
path('usuarios/upload-foto/', upload_foto, name='upload-foto'),
path('usuarios/remover-foto/', remover_foto, name='remover-foto'),
```

**Endpoints:**
```
POST   /api/usuarios/upload-foto/   → upload nova foto
DELETE /api/usuarios/remover-foto/  → remover foto
```

---

### 1.6 — UserSerializer

```python
fields = ['id', 'email', 'first_name', 'last_name', 'is_active',
          'is_staff', 'is_superuser', 'date_joined', 'groups', 'foto_url']
read_only_fields = ['id', 'date_joined', 'is_superuser', 'foto_url']
```

---

### 1.7 — docker-compose.yml (CRÍTICO)

Adicionar na seção `environment` do backend:
```yaml
- CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
- CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
- CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
```
> Sem isso, o container não recebe as vars mesmo que estejam no `.env`

---

## ETAPA 2 — Frontend

### 2.1 — Componente Avatar

`src/components/Avatar.jsx` — exibe foto ou iniciais:
```jsx
const Avatar = ({ nome, fotoUrl, tamanho = 40 }) => {
    const iniciais = nome?.split(' ').filter(Boolean).slice(0, 2)
        .map(n => n[0]).join('').toUpperCase() || 'U'

    if (fotoUrl) return (
        <img src={fotoUrl} alt={nome}
            style={{ width: tamanho, height: tamanho }}
            className="rounded-full object-cover shrink-0" />
    )

    return (
        <div style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.35 }}
            className="rounded-full bg-gradient-fluir flex items-center justify-center text-white font-semibold shrink-0">
            {iniciais}
        </div>
    )
}
```

---

### 2.2 — Layout final implementado

**Topbar (header superior):**
- Esquerda: botão hamburguer (só mobile)
- Centro: logo Studio Fluir + "Studio Fluir / Sistema"
- Direita: ícone de sair (LogOut) — sem nome, sem avatar

**Sidebar:**
- Sem logo própria no topo
- Bloco de perfil (quando expandida): avatar 56px com hover câmera + nome + email
- Abaixo: menu de navegação

---

### 2.3 — Lógica de upload (Sidebar)

```jsx
// useAuthStore precisa ter setUser:
setUser: (updater) => set(state => ({
    user: typeof updater === 'function' ? updater(state.user) : updater,
})),

// handleUploadFoto na Sidebar:
const handleUploadFoto = async (event) => {
    const arquivo = event.target.files[0]
    if (!arquivo) return
    if (arquivo.size > 2 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande. Máximo 2MB.', variant: 'destructive' })
        event.target.value = ''
        return
    }
    const formData = new FormData()
    formData.append('foto', arquivo)
    try {
        const response = await api.post('/usuarios/upload-foto/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        setUser(prev => ({ ...prev, foto_url: response.data.foto_url }))
        toast({ title: 'Foto atualizada!' })
    } catch (err) {
        const detalhe = err.response?.data?.error || err.response?.status || err.message || 'desconhecido'
        toast({ title: `Erro upload: ${detalhe}`, variant: 'destructive' })
    }
    event.target.value = ''
}
```

> ⚠️ URL correta: `/usuarios/upload-foto/` — SEM `/api/` no início
> O `api` do axios já tem `baseURL = .../api`, então `/api/usuarios/...` vira `/api/api/...`

> ⚠️ Import correto: `import { toast } from '@/hooks/useToast'`
> NÃO usar `@/hooks/use-toast` — esse caminho não existe no projeto

---

## Troubleshooting

| Erro | Causa | Solução |
|---|---|---|
| `Must supply api_key` | Vars não passadas pro container Docker | Adicionar em `docker-compose.yml` → `environment` do backend |
| `Invalid cloud_name Uid_Software` | `CLOUDINARY_CLOUD_NAME` preenchido com o nome da chave, não do cloud | Usar o cloud name real — visível no topo do painel Cloudinary (ex: `dpqy5shqz`) |
| `Could not load @/hooks/use-toast` | Caminho errado no import | Correto: `@/hooks/useToast` |
| Upload cai em `/api/api/usuarios/...` (404) | URL com `/api/` duplicado | Chamar `api.post('/usuarios/upload-foto/', ...)` sem o prefixo `/api/` |

---

## Checklist ✅

### Backend:
- [x] `cloudinary==1.36.0` no `requirements.txt`
- [x] `cloudinary.config()` no `settings.py` via `config()` do decouple
- [x] Campo `foto_url` no model User
- [x] Migration `0002_foto_avatar_user_foto_url`
- [x] Endpoints `POST /api/usuarios/upload-foto/` e `DELETE /api/usuarios/remover-foto/`
- [x] `foto_url` no `UserSerializer` (fields + read_only_fields)
- [x] Vars Cloudinary no `docker-compose.yml`

### Frontend:
- [x] Componente `Avatar.jsx` criado
- [x] `setUser` adicionado ao `useAuthStore`
- [x] Topbar: logo centralizada + ícone sair
- [x] Sidebar: avatar + nome + email acima do menu (expandida)
- [x] Hover na foto → ícone câmera → upload
- [x] Validação tamanho (2MB) e formato (JPG/PNG) no frontend
- [x] URL correta: `/usuarios/upload-foto/` sem prefixo `/api/`
- [x] Import correto: `@/hooks/useToast`

---

**✅ Fase 8 entregue e validada em produção — 24/04/2026**
