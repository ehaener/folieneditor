<?php
// Ablage von Druck-PDF und Vorschaubild unter wp-content/uploads/folieneditor/.
// Dateinamen sind zufällig (128 Bit) und nicht erratbar. PDFs werden zusätzlich
// per .htaccess gesperrt (Apache) und im Backend nur über einen geprüften Download
// ausgeliefert. Vorschaubilder sind öffentlich, weil der Warenkorb sie anzeigt.

defined( 'ABSPATH' ) || exit;

const FOLIENEDITOR_KEEP_DAYS = 30;   // nicht bestellte Dateien werden danach gelöscht

function folieneditor_dir(): string {
	$dir = trailingslashit( wp_upload_dir()['basedir'] ) . 'folieneditor';
	if ( ! is_dir( $dir ) ) {
		wp_mkdir_p( $dir );
		file_put_contents( "$dir/index.php", "<?php // Silence is golden.\n" );
		file_put_contents( "$dir/.htaccess", "Options -Indexes\n<FilesMatch \"\\.pdf$\">\n  Require all denied\n</FilesMatch>\n" );
	}
	return $dir;
}

function folieneditor_file_url( string $name ): string {
	return trailingslashit( wp_upload_dir()['baseurl'] ) . 'folieneditor/' . rawurlencode( $name );
}

// Nur Namen zulassen, die wir selbst vergeben haben
function folieneditor_file_path( string $name ): string {
	if ( ! preg_match( '/^[a-f0-9]{32}\.(pdf|png)$/', $name ) ) {
		return '';
	}
	return folieneditor_dir() . '/' . $name;
}

function folieneditor_upload_error( int $code ): string {
	switch ( $code ) {
		case UPLOAD_ERR_INI_SIZE:
		case UPLOAD_ERR_FORM_SIZE:
			return 'Die Druckdatei ist größer, als der Server erlaubt. Bitte ein kleineres Bild verwenden.';
		case UPLOAD_ERR_NO_FILE:
			return 'Die Druckdatei fehlt. Bitte die Folie im Editor gestalten und dort auf „In den Warenkorb“ klicken.';
		default:
			return 'Die Druckdatei konnte nicht hochgeladen werden. Bitte noch einmal versuchen.';
	}
}

// Prüft und speichert eine hochgeladene Datei. $kind: 'pdf' oder 'png'.
function folieneditor_store_upload( string $field, string $kind ) {
	$f = $_FILES[ $field ] ?? null; // phpcs:ignore WordPress.Security.NonceVerification
	if ( ! $f || ! isset( $f['error'] ) || is_array( $f['error'] ) ) {
		return new WP_Error( 'folieneditor', folieneditor_upload_error( UPLOAD_ERR_NO_FILE ) );
	}
	if ( UPLOAD_ERR_OK !== (int) $f['error'] ) {
		return new WP_Error( 'folieneditor', folieneditor_upload_error( (int) $f['error'] ) );
	}
	$max = 'pdf' === $kind ? folieneditor_max_upload() : 5 * MB_IN_BYTES;
	if ( ! is_uploaded_file( $f['tmp_name'] ) || $f['size'] <= 0 || $f['size'] > $max ) {
		return new WP_Error( 'folieneditor', folieneditor_upload_error( UPLOAD_ERR_INI_SIZE ) );
	}
	if ( 'pdf' === $kind ) {
		$head = (string) file_get_contents( $f['tmp_name'], false, null, 0, 5 );
		if ( '%PDF-' !== $head ) {
			return new WP_Error( 'folieneditor', 'Die Druckdatei ist ungültig. Bitte noch einmal versuchen.' );
		}
	} else {
		$info = @getimagesize( $f['tmp_name'] );
		if ( ! $info || IMAGETYPE_PNG !== $info[2] ) {
			return new WP_Error( 'folieneditor', 'Das Vorschaubild ist ungültig. Bitte noch einmal versuchen.' );
		}
	}
	$name = bin2hex( random_bytes( 16 ) ) . '.' . $kind;
	if ( ! move_uploaded_file( $f['tmp_name'], folieneditor_dir() . '/' . $name ) ) {
		return new WP_Error( 'folieneditor', 'Die Druckdatei konnte nicht gespeichert werden.' );
	}
	return $name;
}

// Löscht Dateien, die älter als FOLIENEDITOR_KEEP_DAYS sind und zu keiner Bestellung gehören.
add_action( 'folieneditor_cleanup', function () {
	global $wpdb;
	$dir = folieneditor_dir();
	$used = array_flip( (array) $wpdb->get_col(
		"SELECT meta_value FROM {$wpdb->prefix}woocommerce_order_itemmeta WHERE meta_key IN ('_folieneditor_pdf', '_folieneditor_preview')"
	) );
	$limit = time() - FOLIENEDITOR_KEEP_DAYS * DAY_IN_SECONDS;
	foreach ( array_merge( glob( "$dir/*.pdf" ) ?: [], glob( "$dir/*.png" ) ?: [] ) as $file ) {
		if ( filemtime( $file ) < $limit && ! isset( $used[ basename( $file ) ] ) ) {
			wp_delete_file( $file );
		}
	}
} );
