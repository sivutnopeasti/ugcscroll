<?php
/**
 * UGC Scroll – WordPress SSO Integration
 *
 * Lisää tämä koodi WordPress-teemasi functions.php-tiedostoon
 * (tai omaan pluginiin).
 *
 * Vaatimukset:
 *   1. Lisää wp-config.php:hen:
 *      define( 'WP_JWT_SECRET', 'sama-salainen-avain-kuin-vercelissa' );
 *
 *   2. Aseta Verceliin ympäristömuuttuja WP_JWT_SECRET samaan arvoon.
 *
 * Käyttö:
 *   - Shortcode: [ugc_scroll_link]           → nappi kirjautuneelle käyttäjälle
 *   - PHP:       ugc_get_sso_url()            → pelkkä URL (tai tyhjä merkkijono)
 *
 * Linkin voimassaolo: 5 minuuttia (muuta UGC_SSO_TTL_SECONDS).
 */

// ── Konfiguraatio ─────────────────────────────────────────────────────────────

if ( ! defined( 'UGC_SCROLL_URL' ) ) {
    define( 'UGC_SCROLL_URL', 'https://ugc-scroll2.vercel.app' );
}

if ( ! defined( 'UGC_SSO_TTL_SECONDS' ) ) {
    define( 'UGC_SSO_TTL_SECONDS', 300 ); // 5 min
}

// ── SSO URL -generaattori ─────────────────────────────────────────────────────

/**
 * Palauttaa SSO-linkin kirjautuneelle WP-käyttäjälle.
 * Jos käyttäjä EI ole kirjautunut, palauttaa UGC Scrollin kirjautumissivun
 * URL:in ?from=ugcsuomi-parametrilla.
 *
 * @param int|null $wp_post_id  Valinnainen: käyttäjän UGC CPT -postauksen ID
 * @return string
 */
function ugc_get_sso_url( int $wp_post_id = null ): string {
    // Ei kirjautunut → vie UGC Scrollin kirjautumissivulle ohjeistuksineen
    if ( ! is_user_logged_in() ) {
        return trailingslashit( UGC_SCROLL_URL ) . 'creator/login?from=ugcsuomi';
    }

    $secret = defined( 'WP_JWT_SECRET' ) ? WP_JWT_SECRET : '';
    if ( ! $secret ) {
        // WP_JWT_SECRET puuttuu wp-config.php:stä — fallback kirjautumissivulle
        return trailingslashit( UGC_SCROLL_URL ) . 'creator/login?from=ugcsuomi';
    }

    $user = wp_get_current_user();

    // --- Hae käyttäjän CPT-postaus automaattisesti jos wp_post_id puuttuu ---
    $cpt_slug = defined( 'UGC_CPT_SLUG' ) ? UGC_CPT_SLUG : 'ugc_sisallontuottaja';
    if ( ! $wp_post_id ) {
        $posts      = get_posts( [ 'post_type' => $cpt_slug, 'author' => $user->ID, 'numberposts' => 1 ] );
        $wp_post_id = $posts ? $posts[0]->ID : null;
    }

    // --- Profiilienkenttä samat vakiot kuin functions-snippet.php:ssä ---
    $acf_premium = defined( 'UGC_ACF_PREMIUM_FIELD' ) ? UGC_ACF_PREMIUM_FIELD : 'premium_tilaus_aktiivinen';
    $age_taxonomy= defined( 'UGC_AGE_TAXONOMY' )      ? UGC_AGE_TAXONOMY      : 'ika';
    $bio_source  = defined( 'UGC_BIO_SOURCE' )        ? UGC_BIO_SOURCE        : 'post_content';
    $acf_bio     = defined( 'UGC_ACF_BIO_FIELD' )     ? UGC_ACF_BIO_FIELD     : 'lyhyt_kuvaus';
    $acf_city    = defined( 'UGC_ACF_CITY_FIELD' )    ? UGC_ACF_CITY_FIELD    : 'kaupunki';

    $is_premium = false;
    $age        = null;
    $city       = null;
    $bio        = null;
    $name       = $user->display_name;

    if ( $wp_post_id ) {
        $post = get_post( $wp_post_id );

        if ( $post && $post->post_title ) $name = $post->post_title;

        // Premium (ACF)
        if ( function_exists( 'get_field' ) ) {
            $is_premium = (bool) get_field( $acf_premium, $wp_post_id );
        }

        // Ikä taksonomiana
        $age_terms = wp_get_post_terms( $wp_post_id, $age_taxonomy, [ 'fields' => 'names' ] );
        if ( ! is_wp_error( $age_terms ) && ! empty( $age_terms ) ) {
            $age_raw = trim( $age_terms[0] );
            if ( ctype_digit( $age_raw ) ) $age = (int) $age_raw;
        }

        // Bio
        switch ( $bio_source ) {
            case 'post_content':
                $bio = $post ? ( wp_strip_all_tags( $post->post_content ) ?: null ) : null;
                break;
            case 'post_excerpt':
                $bio = $post ? ( $post->post_excerpt ?: null ) : null;
                break;
            case 'acf':
                if ( function_exists( 'get_field' ) ) {
                    $bio = get_field( $acf_bio, $wp_post_id ) ?: null;
                }
                break;
        }

        // Kaupunki (ACF)
        if ( function_exists( 'get_field' ) ) {
            $city = get_field( $acf_city, $wp_post_id ) ?: null;
        }
    }

    $payload_data = [
        'email'      => $user->user_email,
        'wp_user_id' => $user->ID,
        'is_premium' => $is_premium,
        'name'       => $name,
        'age'        => $age,
        'city'       => $city,
        'bio'        => $bio,
        'exp'        => time() + UGC_SSO_TTL_SECONDS,
    ];

    if ( $wp_post_id ) {
        $payload_data['wp_post_id'] = $wp_post_id;
    }

    // Base64url-encode payload
    $payload_json = json_encode( $payload_data, JSON_UNESCAPED_UNICODE );
    $payload_b64  = ugc_base64url_encode( $payload_json );

    // HMAC-SHA256 signature
    $sig_raw = hash_hmac( 'sha256', $payload_b64, $secret, true );
    $sig_b64 = ugc_base64url_encode( $sig_raw );

    $token = $payload_b64 . '.' . $sig_b64;

    return trailingslashit( UGC_SCROLL_URL ) . 'auth/wp?token=' . rawurlencode( $token );
}

/**
 * Yksinkertainen base64url-enkoodaus ilman pehmustetta.
 */
function ugc_base64url_encode( string $data ): string {
    return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
}

// ── Shortcode: [ugc_scroll_link] ─────────────────────────────────────────────

/**
 * Käyttö: [ugc_scroll_link label="Hallinnoi videoitasi"]
 * Näyttää napin kirjautuneelle käyttäjälle, piilottaa muuten.
 */
function ugc_scroll_link_shortcode( array $atts ): string {
    if ( ! is_user_logged_in() ) {
        return '';
    }

    $atts = shortcode_atts( [
        'label'      => 'Hallinnoi UGC-videoitasi →',
        'class'      => 'ugc-sso-button',
        'wp_post_id' => '',
    ], $atts );

    $wp_post_id = $atts['wp_post_id'] ? (int) $atts['wp_post_id'] : null;
    $url        = ugc_get_sso_url( $wp_post_id );

    if ( ! $url ) {
        return '<!-- ugc_scroll_link: WP_JWT_SECRET puuttuu wp-config.php:stä -->';
    }

    $label = esc_html( $atts['label'] );
    $class = esc_attr( $atts['class'] );
    $href  = esc_url( $url );

    return sprintf(
        '<a href="%s" class="%s" rel="noopener noreferrer">%s</a>',
        $href,
        $class,
        $label
    );
}
add_shortcode( 'ugc_scroll_link', 'ugc_scroll_link_shortcode' );

// ── Profiilinäkymä (WooCommerce My Account tai wp_nav_menu) ──────────────────

/**
 * Esimerkki: lisää SSO-linkki WooCommerce "Oma tili" -sivun valikkoon.
 * Poista kommentit jos WooCommerce on käytössä.
 */
/*
add_filter( 'woocommerce_account_menu_items', function( array $items ): array {
    $items['ugc-scroll'] = 'UGC-profiili';
    return $items;
} );

add_action( 'woocommerce_account_ugc-scroll_endpoint', function (): void {
    $url = ugc_get_sso_url();
    if ( $url ) {
        wp_redirect( $url );
        exit;
    }
    echo '<p>SSO-linkki ei ole saatavilla.</p>';
} );

add_rewrite_endpoint( 'ugc-scroll', EP_ROOT | EP_PAGES );
*/
