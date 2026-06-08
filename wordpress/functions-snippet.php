<?php
/**
 * UGC Suomi – Sync creator to Vercel/Supabase
 *
 * Lisää tämä koodi WordPress-teemasi functions.php-tiedostoon.
 *
 * KONFIGURAATIO — aseta wp-config.php:hen:
 *   define('UGC_VERCEL_URL',   'https://ugc-scroll2.vercel.app');
 *   define('UGC_SYNC_SECRET',  'sama-arvo-kuin-vercelissa-SYNC_SECRET');
 *
 * KENTÄT — muokkaa vakioita vastaamaan omaa WordPress-asennustasi:
 *
 *   UGC_CPT_SLUG          – mukautetun sisältötyypin slug
 *   UGC_ACF_PREMIUM_FIELD – ACF checkbox/true-false premium-tilan tallennus
 *   UGC_AGE_TAXONOMY      – ikä-taksonomian slug (jos ikä on taksonomia)
 *   UGC_BIO_SOURCE        – 'post_content' | 'post_excerpt' | 'acf'
 *   UGC_ACF_BIO_FIELD     – ACF-kentän nimi biolla (jos UGC_BIO_SOURCE = 'acf')
 *   UGC_ACF_CITY_FIELD    – ACF-kentän nimi kaupungille
 */

if ( ! defined( 'UGC_CPT_SLUG' ) )          define( 'UGC_CPT_SLUG',          'ugc_sisallontuottaja' );
if ( ! defined( 'UGC_ACF_PREMIUM_FIELD' ) )  define( 'UGC_ACF_PREMIUM_FIELD',  'premium_tilaus_aktiivinen' );
if ( ! defined( 'UGC_AGE_TAXONOMY' ) )        define( 'UGC_AGE_TAXONOMY',        'ika' );          // ikä taksonomiana
if ( ! defined( 'UGC_BIO_SOURCE' ) )          define( 'UGC_BIO_SOURCE',          'post_content' ); // tai 'post_excerpt' tai 'acf'
if ( ! defined( 'UGC_ACF_BIO_FIELD' ) )       define( 'UGC_ACF_BIO_FIELD',       'lyhyt_kuvaus' ); // käytetään vain jos UGC_BIO_SOURCE = 'acf'
if ( ! defined( 'UGC_ACF_CITY_FIELD' ) )      define( 'UGC_ACF_CITY_FIELD',      'kaupunki' );

// ---------------------------------------------------------------------------

add_action( 'save_post_' . UGC_CPT_SLUG, 'ugc_sync_creator_to_vercel', 20, 2 );

function ugc_sync_creator_to_vercel( int $post_id, WP_Post $post ): void {
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
    if ( wp_is_post_revision( $post_id ) )                return;

    $vercel_url  = defined( 'UGC_VERCEL_URL' )  ? UGC_VERCEL_URL  : '';
    $sync_secret = defined( 'UGC_SYNC_SECRET' ) ? UGC_SYNC_SECRET : '';

    if ( empty( $vercel_url ) || empty( $sync_secret ) ) {
        error_log( 'UGC Sync: UGC_VERCEL_URL tai UGC_SYNC_SECRET puuttuu.' );
        return;
    }

    $wp_user_id = (int) $post->post_author;
    $user       = get_userdata( $wp_user_id );
    if ( ! $user ) {
        error_log( "UGC Sync: käyttäjää ei löydy postille $post_id (author $wp_user_id)." );
        return;
    }

    // ── Premium-tila (ACF) ──────────────────────────────────────────────────
    $is_premium = false;
    if ( function_exists( 'get_field' ) ) {
        $is_premium = (bool) get_field( UGC_ACF_PREMIUM_FIELD, $post_id );
    }

    // ── Ikä taksonomiana ────────────────────────────────────────────────────
    // Taksonomia palauttaa termin nimen, esim. "28" tai "25-30".
    // Otetaan ensimmäinen termi ja yritetään muuntaa kokonaisluvuksi.
    $age = null;
    $age_terms = wp_get_post_terms( $post_id, UGC_AGE_TAXONOMY, [ 'fields' => 'names' ] );
    if ( ! is_wp_error( $age_terms ) && ! empty( $age_terms ) ) {
        $age_raw = trim( $age_terms[0] );
        // Hyväksy "28", hylkää "25-30" (väli) tai teksti
        if ( ctype_digit( $age_raw ) ) {
            $age = (int) $age_raw;
        }
    }

    // ── Bio ─────────────────────────────────────────────────────────────────
    $bio = null;
    switch ( UGC_BIO_SOURCE ) {
        case 'post_content':
            $bio = wp_strip_all_tags( $post->post_content ) ?: null;
            break;
        case 'post_excerpt':
            $bio = $post->post_excerpt ?: null;
            break;
        case 'acf':
            if ( function_exists( 'get_field' ) ) {
                $bio = get_field( UGC_ACF_BIO_FIELD, $post_id ) ?: null;
            }
            break;
    }

    // ── Kaupunki (ACF) ──────────────────────────────────────────────────────
    $city = null;
    if ( function_exists( 'get_field' ) ) {
        $city = get_field( UGC_ACF_CITY_FIELD, $post_id ) ?: null;
    }

    // ── Nimi: otsikko tai käyttäjän näyttönimi ──────────────────────────────
    $name = $post->post_title ?: $user->display_name;

    // ── Lähetetään payload ──────────────────────────────────────────────────
    $payload = [
        'wp_user_id' => $wp_user_id,
        'wp_post_id' => $post_id,
        'email'      => $user->user_email,
        'name'       => $name,
        'is_premium' => $is_premium,
        'age'        => $age,
        'city'       => $city,
        'bio'        => $bio,
    ];

    $response = wp_remote_post(
        trailingslashit( $vercel_url ) . 'api/sync-creator',
        [
            'timeout'     => 10,
            'headers'     => [
                'Content-Type'  => 'application/json',
                'X-Sync-Secret' => $sync_secret,
            ],
            'body'        => wp_json_encode( $payload ),
            'data_format' => 'body',
        ]
    );

    if ( is_wp_error( $response ) ) {
        error_log( 'UGC Sync virhe: ' . $response->get_error_message() );
    } else {
        $code = wp_remote_retrieve_response_code( $response );
        $body = wp_remote_retrieve_body( $response );
        error_log( "UGC Sync: post $post_id → HTTP $code: $body" );
    }
}
