# 📧 Resend API Key Kurulum Rehberi

Bu rehber, Network GPT projesinde Resend API key kullanarak e-posta gönderimi için gerekli kurulum adımlarını içerir.

## 🚀 Hızlı Başlangıç

### 1. Resend Hesabı Oluşturma

1. [Resend.com](https://resend.com) adresine gidin
2. **Sign Up** butonuna tıklayın
3. E-posta adresinizle hesap oluşturun
4. E-posta doğrulamasını tamamlayın

### 2. API Key Alma

1. Resend Dashboard'a giriş yapın
2. Sol menüden **API Keys** seçin
3. **Create API Key** butonuna tıklayın
4. API key'e bir isim verin (örn: "Network GPT")
5. **Create** butonuna tıklayın
6. **API key'i kopyalayın** (bir daha göremezsiniz!)

### 3. Supabase Environment Variables

1. [Supabase Dashboard](https://supabase.com/dashboard) açın
2. Projenizi seçin
3. Sol menüden **Settings** > **Edge Functions** seçin
4. **Environment variables** bölümünde:

```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

5. **Save** butonuna tıklayın

### 4. Edge Functions Deploy

Terminal'de proje klasörüne gidin:

```bash
# Edge Functions'ları deploy edin
supabase functions deploy invite-submit-new
supabase functions deploy invite-submit
supabase functions deploy send-invite-email
supabase functions deploy invite-send-info-email
```

## ✅ Test Etme

### 1. API Key Test

```bash
# Test e-postası gönderin
curl -X POST https://your-project.supabase.co/functions/v1/send-invite-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "inviteLink": "https://your-app.com/invite/test-token",
    "inviterName": "Test User"
  }'
```

### 2. Uygulama Test

1. Network GPT uygulamanızı açın
2. Yeni bir kişi ekleyin
3. E-posta gönderimi seçeneğini işaretleyin
4. E-postanın geldiğini kontrol edin

## 🔧 Sorun Giderme

### API Key Hatası

```
Error: Resend API key not configured
```

**Çözüm:**
- Supabase Environment Variables'da `RESEND_API_KEY` doğru ayarlandı mı?
- Edge Functions'ları yeniden deploy ettiniz mi?

### E-posta Gönderilmiyor

```
Error: Resend email send failed
```

**Çözüm:**
- API key geçerli mi?
- Resend hesabınızda kredi var mı?
- E-posta adresi geçerli mi?

### Rate Limit Hatası

```
Error: Rate limit exceeded
```

**Çözüm:**
- Resend ücretsiz planında günlük 100 e-posta limiti var
- Ücretli plana geçin veya limiti bekleyin

## 💰 Fiyatlandırma

### Ücretsiz Plan
- ✅ Günlük 100 e-posta
- ✅ API erişimi
- ✅ Temel analytics

### Ücretli Plan
- 💰 $20/ay (1M e-posta)
- ✅ Gelişmiş analytics
- ✅ Webhook desteği
- ✅ Özel domain

## 📊 Monitoring

### Resend Dashboard
1. [Resend Dashboard](https://resend.com/emails) açın
2. **Emails** sekmesinde gönderilen e-postaları görün
3. **Analytics** sekmesinde istatistikleri inceleyin

### Supabase Logs
```bash
# Edge Function loglarını görün
supabase functions logs invite-submit-new
supabase functions logs invite-submit
supabase functions logs send-invite-email
supabase functions logs invite-send-info-email
```

## 🔒 Güvenlik

### API Key Güvenliği
- ✅ API key'i asla kodda saklamayın
- ✅ Environment variables kullanın
- ✅ API key'i düzenli olarak yenileyin

### E-posta Güvenliği
- ✅ SPF, DKIM, DMARC kayıtları
- ✅ Spam filtrelerine dikkat
- ✅ E-posta içeriği kalitesi

## 📞 Destek

### Resend Destek
- 📧 support@resend.com
- 💬 [Discord](https://discord.gg/resend)
- 📖 [Dokümantasyon](https://resend.com/docs)

### Supabase Destek
- 📧 support@supabase.com
- 💬 [Discord](https://discord.supabase.com)
- 📖 [Dokümantasyon](https://supabase.com/docs)

---

**🎉 Tebrikler!** Resend API key kurulumunuz tamamlandı. Artık Network GPT uygulamanızda güvenilir e-posta gönderimi yapabilirsiniz.

## 📝 Not

- Tüm SMTP referansları kaldırıldı
- Sadece Resend API kullanılıyor
- Fallback olarak e-posta simülasyonu yapılıyor
- API key olmadan da uygulama çalışır (simülasyon modunda)
