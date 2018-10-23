var vscode = require( 'vscode' );
var path = require( 'path' );
var fs = require( 'fs' );
var minimatch = require( 'minimatch' );

var config = require( './config.js' );

var commentPatterns = require( 'comment-patterns' );

function isHexColour( rgb )
{
    return ( typeof rgb === "string" ) && ( rgb.length === 3 || rgb.length === 6 ) && !isNaN( parseInt( rgb, 16 ) );
}

function removeBlockComments( text, fileName )
{
    var commentPattern;
    try
    {
        commentPattern = commentPatterns( fileName );
    }
    catch( e )
    {
    }

    if( commentPattern && commentPattern.multiLineComment && commentPattern.multiLineComment.length > 0 )
    {
        commentPattern = commentPatterns.regex( fileName );
        if( commentPattern && commentPattern.regex )
        {
            var commentMatch = commentPattern.regex.exec( text );
            if( commentMatch )
            {
                for( var i = commentPattern.cg.contentStart; i < commentMatch.length; ++i )
                {
                    if( commentMatch[ i ] )
                    {
                        text = commentMatch[ i ];
                        break;
                    }
                }
            }
        }
    }

    return text;
}

function extractTag( text )
{
    var c = vscode.workspace.getConfiguration( 'todo-tree' );
    var regex = c.get( 'regex' );
    var flags = c.get( 'regexCaseSensitive' ) ? '' : 'i';
    var tagMatch;

    if( regex.indexOf( "$TAGS" ) > -1 )
    {
        var tagRegex = new RegExp( "(" + c.get( 'tags' ).join( "|" ) + ")", flags );

        tagMatch = tagRegex.exec( text );
        if( tagMatch )
        {
            text = text.substr( tagMatch.index );
            if( config.shouldGroup() )
            {
                text = text.substr( tagMatch[ 0 ].length );
            }
        }
    }

    return { tag: tagMatch ? tagMatch[ 0 ] : "", withoutTag: text };
}

function getRegexSource()
{
    var config = vscode.workspace.getConfiguration( 'todo-tree' );

    var regex = config.regex;
    if( regex.indexOf( "($TAGS)" ) > -1 )
    {
        var tags = config.tags.join( "|" );
        tags = tags.replace( /\\/g, '\\x5c' );
        regex = regex.replace( "$TAGS", tags );
    }

    return regex;
}

function getRegex()
{
    var flags = 'gm';
    if( vscode.workspace.getConfiguration( 'todo-tree' ).get( 'regexCaseSensitive' ) === false )
    {
        flags += 'i';
    }

    return RegExp( getRegexSource(), flags );
}

function exeName()
{
    var isWin = /^win/.test( process.platform );
    return isWin ? "rg.exe" : "rg";
}

function exePathIsDefined( rgExePath )
{
    return fs.existsSync( rgExePath ) ? rgExePath : undefined;
}

function getRgPath()
{
    var rgPath = "";

    rgPath = exePathIsDefined( vscode.workspace.getConfiguration( 'todo-tree' ).ripgrep );
    if( rgPath ) return rgPath;

    rgPath = exePathIsDefined( path.join( path.dirname( path.dirname( require.main.filename ) ), "node_modules/vscode-ripgrep/bin/", exeName() ) );
    if( rgPath ) return rgPath;

    rgPath = exePathIsDefined( path.join( path.dirname( path.dirname( require.main.filename ) ), "node_modules.asar.unpacked/vscode-ripgrep/bin/", exeName() ) );
    if( rgPath ) return rgPath;

    return rgPath;
}

function shouldIgnore( filename )
{
    var globs = vscode.workspace.getConfiguration( 'todo-tree' ).globs;

    var result = false;

    if( globs.length > 0 )
    {
        result = true;
        globs.map( function( glob )
        {
            if( minimatch( filename, glob ) )
            {
                result = false;
            }
        } );
    }

    return result;
}

module.exports.isHexColour = isHexColour;
module.exports.removeBlockComments = removeBlockComments;
module.exports.extractTag = extractTag;
module.exports.getRegexSource = getRegexSource;
module.exports.getRegex = getRegex;
module.exports.getRgPath = getRgPath;
module.exports.shouldIgnore = shouldIgnore;