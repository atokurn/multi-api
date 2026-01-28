# Melolo APK Reverse Engineering Documentation

## App Information

| Property | Value |
|----------|-------|
| **Package Name** | `com.worldance.drama` |
| **App Version** | 5.1.0 (code: 51020) |
| **App Name** | Melolo |
| **Developer** | Worldance (ByteDance subsidiary) |
| **Min SDK** | 23 (Android 6.0) |
| **Target SDK** | 35 (Android 15) |

## API Configuration

### Base URLs

| Service | URL |
|---------|-----|
| **Main API** | `https://api.tmtreader.com` |
| **CDN API** | `https://api.tmtreader.com` |
| **Log Service** | `https://log.tmtreader.com/service/2/app_log/` |
| **Passport Service** | `https://passport.tmtreader.com/service/2/device_register/` |
| **Settings Service** | `https://api.tmtreader.com/service/settings/v3/` |
| **Website/Share** | `https://www.melolo.org` |

### Alternative/Fallback URLs

- `https://log.byteoversea.com/service/2/app_log/`
- `https://log15.byteoversea.com/service/2/app_log/`
- `https://rtlog.byteoversea.com/service/2/app_log/`

---

## API Endpoints

### Book Mall API (`BookMallApiService`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/i18n_novel/bookmall/tab/v1/` | Get Book Mall Home Page |
| GET | `/i18n_novel_cdn/bookmall/tab/v1/` | Get Book Mall Home Page (CDN) |
| GET | `/i18n_novel/bookmall/cell/change/v1/` | Get Cell Change Data |
| GET | `/i18n_novel/bookmall/plan/v1/` | Get Common Plan |

---

### Book API (`BookApiService`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/i18n_novel/book/books/detail/` | Get Multiple Book Details |
| GET | `/i18n_novel/book/land_page_info/v1/` | Get Book Landing Page Info |
| GET | `/i18n_novel/book/bookshelf/list/v1/` | Get Bookshelf List |
| GET | `/i18n_novel/book/category/list/v1/` | Get Category List |
| GET | `/i18n_novel/book/directory/info/v1/` | Get Directory Info |
| GET | `/i18n_novel/book/questionnaire/list/v1/` | Get Questionnaire Info |
| GET | `/i18n_novel/book/feedback/reason_list/v1/` | Get User Feedback Reason Info |
| POST | `/i18n_novel/book/bookshelf/add/v1/` | Add to Bookshelf |
| POST | `/i18n_novel/book/bookshelf/delete/v1/` | Delete from Bookshelf |
| POST | `/i18n_novel/book/bookshelf/sync/v1/` | Sync Bookshelf |
| POST | `/i18n_novel/book/questionnaire/report/v1/` | Report Questionnaire |
| POST | `/i18n_novel/book/upload_non_recommend/v1/` | Upload Non-Recommend Event |

---

### Search API (`SearchApiService`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/i18n_novel/search/page/v1/` | Get Search Result Page |
| GET | `/i18n_novel/search/front_page/v1/` | Get Search Front Page |
| GET | `/i18n_novel/search/suggest/v1/` | Get Search Suggestions |
| GET | `/i18n_novel/search/cell/change/v1/` | Get Search Cell Change Data |
| GET | `/i18n_novel/search/scroll_recommend/v1/` | Get Search Scroll Recommend |

---

### Reader API (`ReaderApiService`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/i18n_novel/reader/items/full/` | Get Full Items (Content) |
| GET | `/i18n_novel/reader/recommend/book_end/v1/` | Book End Recommendation |
| GET | `/i18n_novel/reader/history/list/v1/` | Get User Read History |
| GET | `/i18n_novel/reader/book_history/list/v1/` | Get Book Read History |
| GET | `/i18n_novel/reader/short_play/get_time/v1/` | Get Short Play Time |
| GET | `/i18n_novel/reader/user/token/v1/` | Get UID Token |
| POST | `/i18n_novel/reader/history/report/v1/` | Report User Read History |
| POST | `/i18n_novel/reader/history/delete/v1/` | Delete User Read History |
| POST | `/i18n_novel/reader/history/sync/v1/` | Sync User Read History |
| POST | `/i18n_novel/reader/short_play/set_time/v1/` | Set Short Play Time |
| POST | `/i18n_novel/reader/book_history/update/v1/` | Update Book Read History |

---

### Player API (`PlayerApiService`) - **IMPORTANT FOR VIDEO**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/novel/player/video_detail/v1/` | Get Video Detail |
| POST | `/novel/player/video_model/v1/` | Get Video Model (URL/Stream) |
| POST | `/novel/player/multi_video_detail/v1/` | Get Multiple Video Details |
| POST | `/novel/player/multi_video_model/v1/` | Get Multiple Video Models |

---

### Trade/VIP API (`TradeService`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/i18n_novel/trade/sub_order_status_check_v3/v1/` | Check Subscription Order Status |
| GET | `/i18n_novel/trade/little_end/ab_config/v1/` | Get AB Config |
| GET | `/i18n_novel/trade/vip/product_list_v3/v1/` | Get VIP Product List |
| POST | `/i18n_novel/trade/vip/create_subscribe_order_v3/v1/` | Create Subscribe Order |
| POST | `/i18n_novel/trade/ad_list_v2/v1/` | Get Ad List |
| POST | `/i18n_novel/trade/vip/popup/v1/` | VIP Popup |
| POST | `/i18n_novel/trade/vip/popup/record/v1/` | VIP Popup Record |

---

### UGC Comments API (`UgcApiService`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/i18n_novel/ugc/comment/book/list/v1/` | Get Book Comments |
| GET | `/i18n_novel/ugc/comment/item/list/v1/` | Get Item Comments |
| GET | `/i18n_novel/ugc/reply/item/list/v1/` | Get Reply List |
| GET | `/i18n_novel/ugc/message/item_reply/v1/` | Get Message Reply |
| GET | `/i18n_novel/ugc/comment/post/list/v1/` | Get Post Comments |
| GET | `/i18n_novel/ugc/reply/post/list/v1/` | Get Post Replies |
| GET | `/i18n_novel/ugc/post/url/v1/` | Get Post URL |
| GET | `/i18n_novel/ugc/comment/topic/list/v1/` | Get Topic Comments |
| GET | `/i18n_novel/ugc/post/detail/v1/` | Get Post Detail |
| GET | `/i18n_novel/ugc/user_comment_reply/list/v1/` | Get User Comment Reply List |
| GET | `/i18n_novel/ugc/user_post/list/v1/` | Get User Posts |
| GET | `/i18n_novel/ugc/user_relation/list/v1/` | Get User Relations |
| POST | `/i18n_novel/ugc/reply/add/v1/` | Add Reply |
| POST | `/i18n_novel/ugc/comment/add/v1/` | Add Comment |
| POST | `/i18n_novel/ugc/comment/delete/v1/` | Delete Comment |
| POST | `/i18n_novel/ugc/delete/v1/` | Delete UGC |
| POST | `/i18n_novel/ugc/comment/digg/v1/` | Like Comment |
| POST | `/i18n_novel/ugc/action/v1/` | UGC Action |
| POST | `/i18n_novel/ugc/comment/report/v1/` | Report Comment |
| POST | `/i18n_novel/ugc/report/v1/` | Report UGC |
| POST | `/i18n_novel/ugc/comment/update/v1/` | Update Comment |

---

### User Growth API (`UserGrowthApiService`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/i18n_novel/ug/info_v2/v1/` | Get UG Info |
| POST | `/i18n_novel/ug/af/v1/` | AF Event |
| POST | `/i18n_novel/ug/upload_event/v1/` | Upload Event |

---

### Referral/Lucky Cat API (Retrofit)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/luckycat/i18n/melolo/referral/v1/settings/get` | Get Referral Settings |
| GET | `/luckycat/i18n/melolo/referral/v1/task/list` | Get Task List |
| GET | `/luckycat/i18n/melolo/referral/v1/popup/code_start/get` | Get Popup Info |
| POST | `/luckycat/i18n/melolo/referral/v1/display/general_info` | Get General Info |
| POST | `/luckycat/i18n/melolo/referral/v1/action/send_push` | Send Push |
| POST | `/luckycat/i18n/melolo/referral/v1/task/done` | Mark Task Done |
| POST | `/luckycat/i18n/melolo/referral/v1/display/task_page_for_tab` | Task Page for Tab |

---

## Request Models

### GetVideoDetailRequest

```json
{
  "series_id": "string",
  "content_type": "VideoContentType",
  "biz_param": "GetVideoBizParam",
  "NovelCommonParam": "NovelCommonParam",
  "flashRequestExt": "string"
}
```

### NovelCommonParam (Headers & Query Params)

| Field | Type | Location | Description |
|-------|------|----------|-------------|
| `Age-Range` | header | HEADER | Age range |
| `Sign-Env` | header | HEADER | Sign environment check |
| `Sign-Res` | header | HEADER | Sign result |
| `X-Forwarded-For` | header | HEADER | Forwarded IP |
| `User-Agent` | header | HEADER | User agent |
| `X-Xs-From-Web` | header | HEADER | Is from web |
| `X-Xs-Web-Imgfmt` | header | HEADER | Web image format |
| `app_language` | query | QUERY | App language |
| `app_region` | query | QUERY | App region |
| `carrier_region` | query | QUERY | Carrier region |
| `current_region` | query | QUERY | Current region |
| `language` | query | QUERY | Language |
| `region` | query | QUERY | Region |
| `time_zone` | query | QUERY | Time zone |
| `sys_language` | query | QUERY | System language |
| `sys_region` | query | QUERY | System region |
| `ui_language` | query | QUERY | UI language |
| `user_language` | query | QUERY | User language |

---

## Response Models

### VideoDetailInfo (Key Fields)

| Field | Type | Description |
|-------|------|-------------|
| `series_id` | long | Series ID |
| `series_id_str` | string | Series ID as string |
| `series_title` | string | Series title |
| `series_intro` | string | Series introduction |
| `series_cover` | string | Cover image URL |
| `series_status` | enum | Series status |
| `episode_cnt` | int | Episode count |
| `episode_total_cnt` | int | Total episode count |
| `duration` | long | Video duration |
| `digg_cnt` | long | Like count |
| `followed_cnt` | long | Follower count |
| `series_play_cnt` | long | Play count |
| `video_list` | array | List of EpisodeInfo |
| `pay_info` | VideoPayInfo | Payment/VIP info |
| `download_config` | DownloadConfig | Download settings |

### SaaSVideoDetailData

| Field | Type | Description |
|-------|------|-------------|
| `video_data` | VideoDetailInfo | Main video details |
| `lock_data` | EpisodeLockData | Episode lock information |
| `preview_material_list` | array | Preview materials |
| `video_post_data` | VideoPostData | Video post data |
| `video_relate_book` | VideoRelateBook | Related book info |

---

## Deep Links / URL Schemes

| Scheme | Description |
|--------|-------------|
| `worldance645713://` | Main app scheme |
| `drama645713://` | Drama scheme |
| `melolodrama.onelink.me` | OneLink deep links |
| `www.melolo.org/page/share/?bid=` | Share book |
| `www.melolo.org/page/share-drama?sid=` | Share drama series |

---

## Key Observations

1. **ByteDance/TikTok Infrastructure**: This app uses ByteDance's SDK infrastructure (RPC, Push, ads, etc.)
2. **Similar to DramaBox**: Uses similar API patterns as DramaBox (`seriessdk`, dragon read saas)
3. **Player API**: Video streaming uses POST requests to `/novel/player/` endpoints
4. **VIP/Lock System**: Has episode locking with `EpisodeLockData` and VIP subscription system
5. **Region-Based**: API requests include region, language, and timezone parameters

---

## Next Steps for API Integration

1. **Authentication**: Need to capture live traffic to understand authentication headers
2. **Device Registration**: Call passport service for device ID
3. **Player API Testing**: Test video endpoints with captured session data
4. **VIP Bypass**: Investigate `lock_data` and `pay_info` structures
