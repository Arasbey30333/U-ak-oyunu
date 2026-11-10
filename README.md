# Yıldız Filosu — Uçak Oyunu

Tarayıcıda çalışan, mobil uyumlu bir arcade uçak oyunu. Dış bağımlılık veya sunucu gerektirmeden yerel olarak açılabilir; PWA olarak HTTPS üzerinden yüklenebilir.

## Özellikler

- Yenilenmiş uzay temalı arayüz ve mobil uyumlu dokunmatik kontroller
- Ses efektleri açma/kapatma (Web Audio)
- Başlangıç ve oyun sonu ekranı
- Her 100 puanda yeni seviye; seviyeye göre düşmanların hızı ve geliş sıklığı artar
- Yüksek skorun ve ses tercihin tarayıcıda `localStorage` ile saklanır
- Yerel pilot profili ve bu cihazda saklanan arkadaş listesi
- Kullanıcı izniyle tarayıcı bildirimi
- Web uygulaması manifesti ve temel çevrimdışı önbellek desteği

## Çalıştırma

`index.html` dosyasını aç. Bildirimler ve PWA kurulumu için HTTPS veya `localhost` üzerinden sunulmalıdır; örneğin:

```bash
python3 -m http.server 8000
```

Ardından `http://localhost:8000` adresini aç.

## Kontroller

- Hareket: `←` / `→` veya `A` / `D`
- Ateş: `Space`
- Mobilde: ekrandaki yön ve ateş düğmeleri

## Hesap, arkadaşlar ve bildirimler hakkında

Bu depo şu anda statik bir web oyunudur. Pilot adı, yüksek skor ve arkadaş listesi yalnızca aynı tarayıcı/cihaz üzerinde tutulur; hesap oluşturma, arkadaş daveti veya cihazlar arası senkronizasyon yapan bir sunucu yoktur. Bildirim düğmesi tarayıcı izni ister; uzaktan/gerçek zamanlı push bildirimleri için ayrıca backend ve Web Push yapılandırması gerekir.

Google Play Games oturumu gerçek anlamda web sayfasından eklenemez. Bunun için Android uygulaması (ör. Capacitor veya native Android), Google Play Console'da Play Games Services projesi, OAuth istemci kimlikleri ve sunucu tarafında güvenli doğrulama kurulmalıdır. Bu demo Google hesabı bilgisi istemez veya toplamaz; arayüz yalnızca gerekli Android yapılandırmasını açıklar.
